import { tool } from "@opencode-ai/plugin";
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// ── Swarm Engine: State, Circuit Breakers, Heartbeat ──────────────────────

const STATE_DIR = ".prides";
const STATE_FILE = join(STATE_DIR, "state.json");
const HEARTBEAT_DIR = join(STATE_DIR, "heartbeat");
const INCIDENTS_DIR = join(STATE_DIR, "incidents");
const SNAPSHOTS_DIR = join(STATE_DIR, "snapshots");
const CONTEXT_DIR = join(STATE_DIR, "context");
const ISSUES_DIR = join(STATE_DIR, "issues");
const OBSERVABILITY_LOG = join(STATE_DIR, "observability.jsonl");

const PHASES = ["P", "R", "I", "D", "E", "S"];
const PHASE_NAMES = {
  P: "Prototype", R: "Review", I: "Implement",
  D: "Deploy", E: "Extend", S: "Secure"
};

function ensureDirs() {
  for (const d of [STATE_DIR, HEARTBEAT_DIR, INCIDENTS_DIR, SNAPSHOTS_DIR, CONTEXT_DIR, ISSUES_DIR]) {
    mkdirSync(d, { recursive: true });
  }
}

function readJSON(path, fallback) {
  try { return JSON.parse(readFileSync(path, "utf-8")); }
  catch { return fallback; }
}

function writeJSON(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

function appendLog(entry) {
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() }) + "\n";
  try {
    appendFileSync(OBSERVABILITY_LOG, line);
  } catch { /* best effort */ }
}

function getState() {
  return readJSON(STATE_FILE, {
    currentPhase: null,
    status: "idle",
    phaseHistory: [],
    circuitBreakers: {},
    gateResults: {},
    version: 0
  });
}

function saveState(state) {
  state.version = (state.version || 0) + 1;
  writeJSON(STATE_FILE, state);
}

// ── Circuit Breaker Logic ─────────────────────────────────────────────────

const CIRCUIT_CLOSED = "closed";
const CIRCUIT_OPEN = "open";
const CIRCUIT_HALF_OPEN = "half-open";
const FAILURE_THRESHOLD = 3;
const RECOVERY_TIMEOUT_MS = 60000;

function getCircuitBreaker(state, agentId) {
  if (!state.circuitBreakers) state.circuitBreakers = {};
  if (!state.circuitBreakers[agentId]) {
    state.circuitBreakers[agentId] = {
      state: CIRCUIT_CLOSED,
      failures: 0,
      lastFailure: null,
      lastSuccess: null
    };
  }
  return state.circuitBreakers[agentId];
}

function recordFailure(state, agentId) {
  const cb = getCircuitBreaker(state, agentId);
  cb.failures++;
  cb.lastFailure = Date.now();
  if (cb.failures >= FAILURE_THRESHOLD) {
    cb.state = CIRCUIT_OPEN;
    appendLog({ event: "circuit_open", agent: agentId, failures: cb.failures });
  }
  saveState(state);
}

function recordSuccess(state, agentId) {
  const cb = getCircuitBreaker(state, agentId);
  cb.failures = 0;
  cb.state = CIRCUIT_CLOSED;
  cb.lastSuccess = Date.now();
  saveState(state);
}

function checkCircuit(state, agentId) {
  const cb = getCircuitBreaker(state, agentId);
  if (cb.state === CIRCUIT_CLOSED) return { allowed: true };
  if (cb.state === CIRCUIT_OPEN) {
    const elapsed = Date.now() - (cb.lastFailure || 0);
    if (elapsed > RECOVERY_TIMEOUT_MS) {
      cb.state = CIRCUIT_HALF_OPEN;
      saveState(state);
      return { allowed: true, halfOpen: true };
    }
    return { allowed: false, reason: `Circuit OPEN for ${agentId}. ${Math.ceil((RECOVERY_TIMEOUT_MS - elapsed) / 1000)}s until retry.` };
  }
  // half-open: allow one test
  return { allowed: true, halfOpen: true };
}

// ── Validation Gate Logic ─────────────────────────────────────────────────

const GATE_CHECKS = {
  "P→R": ["prd_exists", "requirements_clear", "scope_defined"],
  "R→I": ["review_complete", "no_blockers", "architecture_approved"],
  "I→D": ["tests_pass", "lint_clean", "no_regressions"],
  "D→E": ["smoke_tests_pass", "health_checks_ok", "deploy_verified"],
  "E→S": ["no_arch_debt", "scalability_reviewed", "performance_ok"],
  "S→DONE": ["no_vulns", "compliance_met", "security_signed_off"]
};

// ── Tools ─────────────────────────────────────────────────────────────────

const heartbeat = tool({
  description: "Report agent heartbeat health. Call periodically to signal liveness. Returns circuit breaker status.",
  args: {
    agent: tool.schema.string().describe("Agent identifier (e.g. implement-coder, prototype-prd)"),
    phase: tool.schema.string().describe("Current PRIDES phase (P, R, I, D, E, S)"),
    status: tool.schema.enum(["healthy", "degraded", "failing"]).describe("Agent health status"),
    message: tool.schema.string().optional().describe("Optional status message")
  },
  async execute(args) {
    ensureDirs();
    const state = getState();
    const cb = checkCircuit(state, args.agent);

    if (!cb.allowed) {
      return { title: `Circuit OPEN: ${args.agent}`, output: cb.reason, metadata: { circuit: "open" } };
    }

    // Write heartbeat pulse
    const pulseFile = join(HEARTBEAT_DIR, `${args.phase}-pulse.log`);
    const pulse = `[${new Date().toISOString()}] ${args.agent}: ${args.status} ${args.message || ""}\n`;
    appendFileSync(pulseFile, pulse);

    if (args.status === "failing") {
      recordFailure(state, args.agent);
    } else {
      recordSuccess(state, args.agent);
    }

    appendLog({ event: "heartbeat", agent: args.agent, phase: args.phase, status: args.status });

    return {
      title: `Heartbeat: ${args.agent}`,
      output: `${args.agent} is ${args.status} in phase ${args.phase}. Circuit: ${getCircuitBreaker(state, args.agent).state}`,
      metadata: { circuit: getCircuitBreaker(state, args.agent).state, halfOpen: !!cb.halfOpen }
    };
  }
});

const gateCheck = tool({
  description: "Run deterministic validation gate before phase transition. BLOCKS if checks fail.",
  args: {
    from: tool.schema.string().describe("Source phase (P, R, I, D, E, S)"),
    to: tool.schema.string().describe("Target phase (P, R, I, D, E, S, or DONE)"),
    results: tool.schema.string().describe("JSON object mapping check names to pass/fail status")
  },
  async execute(args) {
    ensureDirs();
    const state = getState();
    const gateKey = `${args.from}→${args.to}`;
    const expectedChecks = GATE_CHECKS[gateKey] || [];
    let parsed;
    try { parsed = JSON.parse(args.results); } catch {
      return { title: "Gate Error", output: "results must be valid JSON", metadata: { blocked: true } };
    }

    const failures = [];
    const passes = [];
    for (const check of expectedChecks) {
      if (parsed[check] === "pass" || parsed[check] === true) {
        passes.push(check);
      } else {
        failures.push(check);
      }
    }

    // Check for unresolved blocking issues in the source phase
    const phaseIssues = [];
    try {
      const issueFiles = readdirSync(ISSUES_DIR).filter(f => f.endsWith(".json"));
      for (const file of issueFiles) {
        try {
          const issue = JSON.parse(readFileSync(join(ISSUES_DIR, file), "utf-8"));
          if (issue.status === "open" && issue.blocking && issue.phase === args.from) {
            phaseIssues.push(issue);
          }
        } catch { /* skip */ }
      }
    } catch { /* no issues dir */ }

    if (phaseIssues.length > 0) {
      failures.push(`${phaseIssues.length} blocking issue(s) open`);
    }

    const blocked = failures.length > 0;
    const gateResult = {
      gate: gateKey, blocked, passes, failures,
      blockingIssues: phaseIssues.map(i => i.id),
      timestamp: new Date().toISOString()
    };

    if (!state.gateResults) state.gateResults = {};
    state.gateResults[gateKey] = gateResult;
    saveState(state);

    appendLog({ event: "gate_check", gate: gateKey, blocked, passes: passes.length, failures: failures.length });

    if (blocked) {
      const issueMsg = phaseIssues.length > 0
        ? `\n\nBlocking issues (close these first):\n${phaseIssues.map(i => `  - ${i.id}: ${i.title} [${i.severity}]`).join("\n")}`
        : "";
      return {
        title: `GATE BLOCKED: ${gateKey}`,
        output: `Phase transition ${gateKey} BLOCKED. Failed checks:\n${failures.map(f => `  - ${f}`).join("\n")}${issueMsg}\n\nFix these before proceeding.`,
        metadata: { blocked: true, failures, blockingIssues: phaseIssues.map(i => i.id) }
      };
    }

    return {
      title: `GATE PASSED: ${gateKey}`,
      output: `All ${passes.length} checks passed for ${gateKey}. Transition approved.`,
      metadata: { blocked: false, passes }
    };
  }
});

const snapshot = tool({
  description: "Save an immutable state snapshot for the current phase. Creates versioned, append-only state.",
  args: {
    phase: tool.schema.string().describe("PRIDES phase (P, R, I, D, E, S)"),
    data: tool.schema.string().describe("JSON data to snapshot"),
    label: tool.schema.string().optional().describe("Optional label for this snapshot")
  },
  async execute(args) {
    ensureDirs();
    const phaseDir = join(SNAPSHOTS_DIR, args.phase);
    mkdirSync(phaseDir, { recursive: true });

    const existing = readdirSync(phaseDir).filter(f => f.endsWith(".json")).length;
    const version = existing + 1;
    const filename = `v${version}${args.label ? `-${args.label}` : ""}.json`;

    let parsed;
    try { parsed = JSON.parse(args.data); } catch { parsed = { raw: args.data }; }

    const snapshot = {
      version, phase: args.phase,
      label: args.label || null,
      data: parsed,
      created: new Date().toISOString(),
      immutable: true
    };

    writeJSON(join(phaseDir, filename), snapshot);
    appendLog({ event: "snapshot", phase: args.phase, version, label: args.label });

    return {
      title: `Snapshot: ${args.phase} v${version}`,
      output: `Saved immutable snapshot ${args.phase}/${filename} (v${version})`,
      metadata: { version, path: `${SNAPSHOTS_DIR}/${args.phase}/${filename}` }
    };
  }
});

const contextWrite = tool({
  description: "Write a context file for subagent delegation. Preserves fidelity instead of summarizing.",
  args: {
    name: tool.schema.string().describe("Context file name (without extension)"),
    content: tool.schema.string().describe("Full context content to write"),
    phase: tool.schema.string().optional().describe("Associated PRIDES phase")
  },
  async execute(args) {
    ensureDirs();
    const phaseDir = args.phase ? join(CONTEXT_DIR, args.phase) : CONTEXT_DIR;
    mkdirSync(phaseDir, { recursive: true });

    const filepath = join(phaseDir, `${args.name}.md`);
    writeFileSync(filepath, args.content);

    appendLog({ event: "context_write", name: args.name, phase: args.phase, bytes: args.content.length });

    return {
      title: `Context: ${args.name}`,
      output: `Wrote ${args.content.length} bytes to ${filepath}. Reference this file when delegating to subagents.`,
      metadata: { path: filepath }
    };
  }
});

const contextRead = tool({
  description: "Read a context file written for subagent delegation.",
  args: {
    name: tool.schema.string().describe("Context file name (without extension)"),
    phase: tool.schema.string().optional().describe("Associated PRIDES phase")
  },
  async execute(args) {
    const phaseDir = args.phase ? join(CONTEXT_DIR, args.phase) : CONTEXT_DIR;
    const filepath = join(phaseDir, `${args.name}.md`);

    try {
      const content = readFileSync(filepath, "utf-8");
      return {
        title: `Context: ${args.name}`,
        output: content,
        metadata: { path: filepath, bytes: content.length }
      };
    } catch {
      return { title: `Context not found: ${args.name}`, output: `No context file at ${filepath}`, metadata: { missing: true } };
    }
  }
});

const phaseStatus = tool({
  description: "Get current PRIDES phase status, circuit breakers, and gate results.",
  args: {},
  async execute() {
    ensureDirs();
    const state = getState();

    const circuits = {};
    for (const [id, cb] of Object.entries(state.circuitBreakers || {})) {
      circuits[id] = { state: cb.state, failures: cb.failures };
    }

    const gates = {};
    for (const [key, result] of Object.entries(state.gateResults || {})) {
      gates[key] = { blocked: result.blocked, passes: result.passes.length, failures: result.failures.length };
    }

    // Recent heartbeat pulses
    const pulses = {};
    for (const phase of PHASES) {
      const pulseFile = join(HEARTBEAT_DIR, `${phase}-pulse.log`);
      try {
        const lines = readFileSync(pulseFile, "utf-8").trim().split("\n");
        pulses[phase] = lines.slice(-5).join("\n");
      } catch { pulses[phase] = "no pulses"; }
    }

    // Open issues
    const openIssues = [];
    try {
      const issueFiles = readdirSync(ISSUES_DIR).filter(f => f.endsWith(".json"));
      for (const file of issueFiles) {
        try {
          const issue = JSON.parse(readFileSync(join(ISSUES_DIR, file), "utf-8"));
          if (issue.status === "open") openIssues.push(issue);
        } catch { /* skip */ }
      }
    } catch { /* no issues dir yet */ }

    const issueLines = openIssues.length > 0
      ? openIssues.map(i => `  ${i.id} [${i.severity.toUpperCase()}] ${i.title} ${i.blocking ? "(BLOCKING)" : ""} [${i.phase}]`)
      : ["  (none)"];

    return {
      title: "PRIDES Status",
      output: [
        `Phase: ${state.currentPhase || "none"} | Status: ${state.status} | Version: ${state.version}`,
        "",
        "Circuit Breakers:",
        ...Object.entries(circuits).map(([id, cb]) => `  ${id}: ${cb.state} (failures: ${cb.failures})`),
        Object.keys(circuits).length === 0 ? "  (none)" : "",
        "",
        "Gate Results:",
        ...Object.entries(gates).map(([k, g]) => `  ${k}: ${g.blocked ? "BLOCKED" : "PASSED"} (${g.passes} pass, ${g.failures} fail)`),
        Object.keys(gates).length === 0 ? "  (none)" : "",
        "",
        `Open Issues (${openIssues.length}):`,
        ...issueLines,
        "",
        "Recent Pulses:",
        ...Object.entries(pulses).map(([p, lines]) => `  [${p}] ${lines}`)
      ].filter(Boolean).join("\n"),
      metadata: { state, circuits, gates, openIssues }
    };
  }
});

const recordIncident = tool({
  description: "Record a phase incident for audit trail.",
  args: {
    phase: tool.schema.string().describe("PRIDES phase where incident occurred"),
    agent: tool.schema.string().describe("Agent involved"),
    severity: tool.schema.enum(["low", "medium", "high", "critical"]).describe("Incident severity"),
    description: tool.schema.string().describe("What happened"),
    resolution: tool.schema.string().optional().describe("How it was resolved")
  },
  async execute(args) {
    ensureDirs();
    const incident = {
      id: `INC-${Date.now()}`,
      phase: args.phase,
      agent: args.agent,
      severity: args.severity,
      description: args.description,
      resolution: args.resolution || null,
      created: new Date().toISOString()
    };

    const incidentFile = join(INCIDENTS_DIR, `${incident.id}.json`);
    writeJSON(incidentFile, incident);
    appendLog({ event: "incident", ...incident });

    return {
      title: `Incident: ${incident.id}`,
      output: `Recorded ${args.severity} incident in ${args.phase}: ${args.description}`,
      metadata: incident
    };
  }
});

const mcpGate = tool({
  description: "Get recommended MCP servers for a given PRIDES phase. Disable unused MCPs to reduce context noise.",
  args: {
    phase: tool.schema.string().describe("PRIDES phase (P, R, I, D, E, S)")
  },
  async execute(args) {
    const phaseMCPs = {
      P: { keep: ["stitch", "context7", "fetch", "filesystem"], disable: ["github", "gh_grep", "git", "playwright", "chrome-devtools", "natron"] },
      R: { keep: ["git", "github", "gh_grep", "context7", "filesystem"], disable: ["stitch", "playwright", "chrome-devtools", "natron"] },
      I: { keep: ["filesystem", "git", "github", "playwright", "context7"], disable: ["stitch", "gh_grep", "chrome-devtools", "natron"] },
      D: { keep: ["git", "github", "playwright", "fetch"], disable: ["stitch", "context7", "gh_grep", "chrome-devtools", "natron"] },
      E: { keep: ["filesystem", "git", "github", "context7"], disable: ["stitch", "gh_grep", "playwright", "chrome-devtools", "natron"] },
      S: { keep: ["git", "github", "gh_grep", "filesystem", "playwright"], disable: ["stitch", "context7", "chrome-devtools", "natron"] }
    };

    const config = phaseMCPs[args.phase] || { keep: [], disable: [] };
    return {
      title: `MCP Gate: Phase ${args.phase}`,
      output: `Phase ${args.phase} (${PHASE_NAMES[args.phase] || args.phase}):\n\nKEEP enabled:\n${config.keep.map(s => `  - ${s}`).join("\n")}\n\nDISABLE to save context:\n${config.disable.map(s => `  - ${s}`).join("\n")}`,
      metadata: config
    };
  }
});

const transition = tool({
  description: "Transition to a new PRIDES phase. Updates state machine and records history.",
  args: {
    to: tool.schema.string().describe("Target phase (P, R, I, D, E, S)"),
    reason: tool.schema.string().optional().describe("Reason for transition")
  },
  async execute(args) {
    ensureDirs();
    const state = getState();
    const from = state.currentPhase;

    if (!PHASES.includes(args.to)) {
      return { title: "Invalid Phase", output: `Phase must be one of: ${PHASES.join(", ")}`, metadata: { error: true } };
    }

    state.currentPhase = args.to;
    state.status = "active";
    if (!state.phaseHistory) state.phaseHistory = [];
    state.phaseHistory.push({
      from, to: args.to,
      reason: args.reason || null,
      timestamp: new Date().toISOString()
    });

    saveState(state);
    appendLog({ event: "transition", from, to: args.to, reason: args.reason });

    return {
      title: `Transition: ${from || "idle"} → ${args.to}`,
      output: `Now in phase ${args.to} (${PHASE_NAMES[args.to]}). ${args.reason || ""}`,
      metadata: { from, to: args.to }
    };
  }
});

// ── Issue Tracking ────────────────────────────────────────────────────────

function generateIssueId() {
  const existing = readdirSync(ISSUES_DIR).filter(f => f.startsWith("ISS-") && f.endsWith(".json"));
  const nums = existing.map(f => parseInt(f.replace("ISS-", "").replace(".json", ""), 10)).filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `ISS-${String(next).padStart(4, "0")}`;
}

const issueOpen = tool({
  description: "Open a new tracking issue. Creates a persistent issue that blocks phase transitions until resolved.",
  args: {
    title: tool.schema.string().describe("Issue title"),
    description: tool.schema.string().describe("Detailed description of the issue"),
    phase: tool.schema.string().describe("PRIDES phase where the issue was found (P, R, I, D, E, S)"),
    agent: tool.schema.string().describe("Agent that identified the issue"),
    severity: tool.schema.enum(["low", "medium", "high", "critical"]).describe("Issue severity"),
    blocking: tool.schema.boolean().optional().describe("Whether this issue blocks phase transition (default: true for high/critical)"),
    assignee: tool.schema.string().optional().describe("Agent responsible for fixing"),
    tags: tool.schema.string().optional().describe("Comma-separated tags for categorization")
  },
  async execute(args) {
    ensureDirs();
    const id = generateIssueId();
    const isBlocking = args.blocking !== undefined ? args.blocking : (args.severity === "high" || args.severity === "critical");

    const issue = {
      id,
      title: args.title,
      description: args.description,
      phase: args.phase,
      agent: args.agent,
      severity: args.severity,
      status: "open",
      blocking: isBlocking,
      assignee: args.assignee || null,
      tags: args.tags ? args.tags.split(",").map(t => t.trim()) : [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      closedAt: null,
      closedBy: null,
      resolution: null,
      comments: []
    };

    writeJSON(join(ISSUES_DIR, `${id}.json`), issue);
    appendLog({ event: "issue_open", id, title: args.title, severity: args.severity, phase: args.phase, blocking: isBlocking });

    return {
      title: `Issue Opened: ${id}`,
      output: [
        `Opened issue ${id}: ${args.title}`,
        `Severity: ${args.severity} | Blocking: ${isBlocking} | Phase: ${args.phase}`,
        args.assignee ? `Assigned to: ${args.assignee}` : "",
        `Status: OPEN`,
        "",
        args.description
      ].filter(Boolean).join("\n"),
      metadata: issue
    };
  }
});

const issueClose = tool({
  description: "Close a tracking issue after it has been fixed. Records resolution and who closed it.",
  args: {
    id: tool.schema.string().describe("Issue ID (e.g. ISS-0001)"),
    resolution: tool.schema.string().describe("How the issue was resolved"),
    closedBy: tool.schema.string().describe("Agent or user that resolved the issue")
  },
  async execute(args) {
    ensureDirs();
    const filepath = join(ISSUES_DIR, `${args.id}.json`);

    let issue;
    try {
      issue = JSON.parse(readFileSync(filepath, "utf-8"));
    } catch {
      return { title: `Issue Not Found: ${args.id}`, output: `No issue file at ${filepath}`, metadata: { error: true } };
    }

    if (issue.status === "closed") {
      return {
        title: `Already Closed: ${args.id}`,
        output: `Issue ${args.id} was already closed on ${issue.closedAt} by ${issue.closedBy}. Resolution: ${issue.resolution}`,
        metadata: { error: true, issue }
      };
    }

    issue.status = "closed";
    issue.resolution = args.resolution;
    issue.closedBy = args.closedBy;
    issue.closedAt = new Date().toISOString();
    issue.updated = new Date().toISOString();

    writeJSON(filepath, issue);
    appendLog({ event: "issue_close", id: args.id, closedBy: args.closedBy, resolution: args.resolution });

    return {
      title: `Issue Closed: ${args.id}`,
      output: [
        `Closed issue ${args.id}: ${issue.title}`,
        `Resolved by: ${args.closedBy}`,
        `Resolution: ${args.resolution}`,
        `Was blocking: ${issue.blocking ? "YES — unblocks phase transition" : "no"}`
      ].join("\n"),
      metadata: issue
    };
  }
});

const issueComment = tool({
  description: "Add a comment to an existing tracking issue.",
  args: {
    id: tool.schema.string().describe("Issue ID (e.g. ISS-0001)"),
    author: tool.schema.string().describe("Who is commenting"),
    content: tool.schema.string().describe("Comment content")
  },
  async execute(args) {
    ensureDirs();
    const filepath = join(ISSUES_DIR, `${args.id}.json`);

    let issue;
    try {
      issue = JSON.parse(readFileSync(filepath, "utf-8"));
    } catch {
      return { title: `Issue Not Found: ${args.id}`, output: `No issue file at ${filepath}`, metadata: { error: true } };
    }

    const comment = {
      author: args.author,
      content: args.content,
      timestamp: new Date().toISOString()
    };

    issue.comments.push(comment);
    issue.updated = new Date().toISOString();
    writeJSON(filepath, issue);
    appendLog({ event: "issue_comment", id: args.id, author: args.author });

    return {
      title: `Comment on ${args.id}`,
      output: `Added comment to ${args.id}: ${args.content}`,
      metadata: { comment, totalComments: issue.comments.length }
    };
  }
});

const issueList = tool({
  description: "List tracking issues, filtered by status, phase, or severity.",
  args: {
    status: tool.schema.enum(["open", "closed", "all"]).optional().describe("Filter by status (default: open)"),
    phase: tool.schema.string().optional().describe("Filter by PRIDES phase"),
    severity: tool.schema.string().optional().describe("Filter by severity"),
    blocking: tool.schema.boolean().optional().describe("Filter to only blocking issues")
  },
  async execute(args) {
    ensureDirs();
    const filterStatus = args.status || "open";
    const files = readdirSync(ISSUES_DIR).filter(f => f.endsWith(".json")).sort();

    const issues = [];
    for (const file of files) {
      try {
        const issue = JSON.parse(readFileSync(join(ISSUES_DIR, file), "utf-8"));
        if (filterStatus !== "all" && issue.status !== filterStatus) continue;
        if (args.phase && issue.phase !== args.phase) continue;
        if (args.severity && issue.severity !== args.severity) continue;
        if (args.blocking !== undefined && issue.blocking !== args.blocking) continue;
        issues.push(issue);
      } catch { /* skip corrupt files */ }
    }

    if (issues.length === 0) {
      return {
        title: "No Issues Found",
        output: `No ${filterStatus} issues matching filters.`,
        metadata: { count: 0 }
      };
    }

    const lines = issues.map(i => {
      const flags = [
        i.blocking ? "BLOCKING" : "",
        i.severity === "critical" ? "CRIT" : i.severity === "high" ? "HIGH" : i.severity === "medium" ? "MED" : "LOW",
        i.assignee ? `→${i.assignee}` : ""
      ].filter(Boolean).join(" | ");
      return `  ${i.id} [${i.status.toUpperCase()}] ${i.title}  (${flags})  [${i.phase}]`;
    });

    return {
      title: `${issues.length} Issue(s)`,
      output: `Issues (${filterStatus}):\n${lines.join("\n")}`,
      metadata: { count: issues.length, issues }
    };
  }
});

// ── Session Recovery & Memory Decay ───────────────────────────────────────

const PLANNING_DIR = join(".prides", "planning");
const SPECS_DIR = join(".prides", "specs");
const DECAY_LOG = join(STATE_DIR, "decay.jsonl");

function getDecayState() {
  return readJSON(join(STATE_DIR, "decay.json"), {
    items: {},
    lastDecay: null,
    version: 0
  });
}

function saveDecayState(state) {
  state.version = (state.version || 0) + 1;
  writeJSON(join(STATE_DIR, "decay.json"), state);
}

const sessionRecover = tool({
  description: "Recover context after session break or /clear. Finds recent planning sessions, specs, and state to build a catchup report.",
  args: {
    maxAge: tool.schema.number().optional().describe("Max age in hours to consider recent (default: 72)")
  },
  async execute(args) {
    ensureDirs();
    const maxAgeMs = (args.maxAge || 72) * 3600000;
    const now = Date.now();
    const report = [];

    // 1. Current state
    const state = getState();
    report.push(`## Current State`);
    report.push(`Phase: ${state.currentPhase || "none"} | Status: ${state.status} | Version: ${state.version}`);
    report.push("");

    // 2. Open issues
    const openIssues = [];
    try {
      const issueFiles = readdirSync(ISSUES_DIR).filter(f => f.endsWith(".json"));
      for (const file of issueFiles) {
        try {
          const issue = JSON.parse(readFileSync(join(ISSUES_DIR, file), "utf-8"));
          if (issue.status === "open") openIssues.push(issue);
        } catch { /* skip */ }
      }
    } catch { /* no issues */ }

    if (openIssues.length > 0) {
      report.push(`## Open Issues (${openIssues.length})`);
      for (const i of openIssues) {
        report.push(`- ${i.id} [${i.severity}] ${i.title} ${i.blocking ? "(BLOCKING)" : ""}`);
      }
      report.push("");
    }

    // 3. Recent planning sessions
    report.push(`## Recent Planning Sessions`);
    try {
      const sessions = readdirSync(PLANNING_DIR).filter(f => {
        try {
          const stat = statSync(join(PLANNING_DIR, f));
          return stat.isDirectory() && (now - stat.mtimeMs) < maxAgeMs;
        } catch { return false; }
      });

      if (sessions.length > 0) {
        for (const slug of sessions) {
          const planFile = join(PLANNING_DIR, slug, "task_plan.md");
          try {
            const content = readFileSync(planFile, "utf-8");
            const total = (content.match(/- \[.\]/g) || []).length;
            const done = (content.match(/- \[x\]/g) || []).length;
            report.push(`- **${slug}**: ${done}/${total} done`);
          } catch { report.push(`- **${slug}**: (no plan file)`); }
        }
      } else {
        report.push(`  (none in last ${args.maxAge || 72}h)`);
      }
    } catch { report.push(`  (no planning dir)`); }
    report.push("");

    // 4. Recent specs
    report.push(`## Active Specs`);
    try {
      const specs = readdirSync(SPECS_DIR).filter(f => {
        try {
          return readdirSync(join(SPECS_DIR, f)).some(file => file.endsWith(".md"));
        } catch { return false; }
      });
      if (specs.length > 0) {
        for (const spec of specs) {
          if (spec === "archive") continue;
          report.push(`- **${spec}**`);
        }
      } else {
        report.push(`  (none)`);
      }
    } catch { report.push(`  (no specs dir)`); }
    report.push("");

    // 5. Phase history
    if (state.phaseHistory && state.phaseHistory.length > 0) {
      report.push(`## Recent Phase Transitions`);
      const recent = state.phaseHistory.slice(-5);
      for (const h of recent) {
        report.push(`- ${h.from || "start"} → ${h.to} ${h.reason ? `(${h.reason})` : ""}`);
      }
      report.push("");
    }

    // 6. Circuit breakers
    const openCircuits = Object.entries(state.circuitBreakers || {})
      .filter(([_, cb]) => cb.state !== "closed");
    if (openCircuits.length > 0) {
      report.push(`## Circuit Breakers (OPEN/HALF-OPEN)`);
      for (const [id, cb] of openCircuits) {
        report.push(`- ${id}: ${cb.state} (failures: ${cb.failures})`);
      }
      report.push("");
    }

    appendLog({ event: "session_recover", openIssues: openIssues.length });

    return {
      title: "Session Recovery Report",
      output: report.join("\n"),
      metadata: { state, openIssues }
    };
  }
});

const decay = tool({
  description: "Run memory decay on stale state items. Reduces importance of items not accessed recently. Call periodically to prevent stale state pollution.",
  args: {
    decayDays: tool.schema.number().optional().describe("Days of inactivity before decay starts (default: 7)")
  },
  async execute(args) {
    ensureDirs();
    const decayDays = args.decayDays || 7;
    const decayMs = decayDays * 86400000;
    const now = Date.now();

    const decayState = getDecayState();
    let decayed = 0;
    let promoted = 0;
    let pruned = 0;

    // Decay old items
    for (const [key, item] of Object.entries(decayState.items)) {
      const age = now - (item.lastAccessed || item.created);
      if (age > decayMs) {
        const decayFactor = Math.min(age / decayMs, 5); // max 5x decay
        item.importance = Math.max(0, (item.importance || 1) - (decayFactor * 0.2));
        item.decayCount = (item.decayCount || 0) + 1;
        decayed++;

        // Prune if importance drops to 0
        if (item.importance <= 0) {
          delete decayState.items[key];
          pruned++;
        }
      }
    }

    // Promote frequently accessed items
    for (const [key, item] of Object.entries(decayState.items)) {
      if ((item.accessCount || 0) >= 5 && item.importance < 10) {
        item.importance = Math.min(10, item.importance + 1);
        item.promoted = true;
        promoted++;
      }
    }

    decayState.lastDecay = new Date().toISOString();
    saveDecayState(decayState);

    appendLog({ event: "decay", decayed, promoted, pruned });

    return {
      title: "Memory Decay Complete",
      output: `Decayed: ${decayed} items | Promoted: ${promoted} items | Pruned: ${pruned} items`,
      metadata: { decayed, promoted, pruned }
    };
  }
});

const decayTrack = tool({
  description: "Track an item for memory decay/promotion. Use to register important decisions, patterns, or context that should persist or decay over time.",
  args: {
    key: tool.schema.string().describe("Unique key for this item (e.g. 'decision:auth-method')"),
    content: tool.schema.string().describe("What this item is about"),
    importance: tool.schema.number().optional().describe("Initial importance 1-10 (default: 5)")
  },
  async execute(args) {
    ensureDirs();
    const decayState = getDecayState();

    if (!decayState.items) decayState.items = {};

    const existing = decayState.items[args.key];
    if (existing) {
      existing.lastAccessed = Date.now();
      existing.accessCount = (existing.accessCount || 0) + 1;
      existing.content = args.content;
      saveDecayState(decayState);
      return {
        title: `Updated: ${args.key}`,
        output: `Access count: ${existing.accessCount} | Importance: ${existing.importance}`,
        metadata: existing
      };
    }

    decayState.items[args.key] = {
      key: args.key,
      content: args.content,
      importance: args.importance || 5,
      created: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1,
      decayCount: 0,
      promoted: false
    };

    saveDecayState(decayState);
    appendLog({ event: "decay_track", key: args.key, importance: args.importance || 5 });

    return {
      title: `Tracked: ${args.key}`,
      output: `Registered for decay/promotion tracking. Importance: ${args.importance || 5}/10`,
      metadata: decayState.items[args.key]
    };
  }
});

// ── Plugin Export ─────────────────────────────────────────────────────────

export const SwarmPlugin = async (_ctx) => {
  return {
    tool: {
      "swarm_heartbeat": heartbeat,
      "swarm_gate": gateCheck,
      "swarm_snapshot": snapshot,
      "swarm_context_write": contextWrite,
      "swarm_context_read": contextRead,
      "swarm_status": phaseStatus,
      "swarm_incident": recordIncident,
      "swarm_mcp_gate": mcpGate,
      "swarm_transition": transition,
      "swarm_issue_open": issueOpen,
      "swarm_issue_close": issueClose,
      "swarm_issue_comment": issueComment,
      "swarm_issue_list": issueList,
      "swarm_session_recover": sessionRecover,
      "swarm_decay": decay,
      "swarm_decay_track": decayTrack
    }
  };
};

export default SwarmPlugin;
