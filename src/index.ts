import type { PridesPluginInput, PridesTool, PluginResult } from "./types";
import { detectProjectState } from "./orchestrator";
import { createWorkflow, loadWorkflow, advancePhase } from "./workflow";
import { dispatchAgent } from "./dispatch";
import { AGENTS, getAgentsByPhase, PHASE_ORDER } from "./constants";
import { validateProjectId, validateCommand } from "./validation";
import { getPhaseRunner, runPhase } from "./workflows/registry";
import { PipelineLogger } from "./logging";
import { withRetry } from "./retry";
import { PipelineMemory } from "./memory";
import { TokenBudget } from "./budget";
import { HumanApproval, assessRisk } from "./approval";
import { ConflictResolver } from "./conflict";
import { AdaptivePlanner } from "./planning";
import { ParallelExecutor } from "./parallel";
import * as path from "path";

export { PipelineLogger } from "./logging";
export { withRetry, isRetryableError } from "./retry";
export { PipelineMemory } from "./memory";
export { TokenBudget } from "./budget";
export { HumanApproval, assessRisk } from "./approval";
export { ConflictResolver } from "./conflict";
export { AdaptivePlanner } from "./planning";
export { ParallelExecutor } from "./parallel";

export default async function pridesPlugin(
  input: PridesPluginInput
): Promise<PluginResult> {
  const dir = input.directory || process.cwd();
  const dataDir = path.join(dir, ".prides");

  // Initialize infrastructure modules
  const logger = new PipelineLogger({ logDir: path.join(dataDir, "logs") });
  const memory = new PipelineMemory({ dataDir });
  const budget = new TokenBudget({ dataDir });
  const approval = new HumanApproval();
  const conflictResolver = new ConflictResolver();
  const planner = new AdaptivePlanner();
  const parallel = new ParallelExecutor();

  const tools: PridesTool[] = [
    {
      name: "prides_init",
      description: "Initialize a new PRIDES project in the current workspace",
      parameters: {
        type: "object",
        properties: {
          project: {
            type: "string",
            description: "Project name (letters, numbers, hyphens, underscores only)",
          },
        },
        required: ["project"],
      },
      execute: async (args: Record<string, unknown>) => {
        const v = validateProjectId(args.project);
        if (!v.valid) return { text: `Invalid project ID: ${v.error}` };

        const project = args.project as string;
        const projectState = await detectProjectState(dir);
        if (projectState === "existing") {
          const workflow = await loadWorkflow(dir, project);
          if (workflow) {
            return {
              text: `Project "${project}" already exists. Current phase: ${workflow.currentPhase}`,
            };
          }
        }
        const state = await createWorkflow(dir, project);
        return {
          text: `PRIDES project "${project}" initialized. Starting phase: ${state.currentPhase} (${state.phases[state.currentPhase]})`,
        };
      },
    },
    {
      name: "prides_dispatch",
      description:
        "Dispatch a single task to the appropriate PRIDES agent by command name",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description:
              "Command to dispatch (init, new-feature, bug-fix, review, deploy, secure, etc.)",
          },
        },
        required: ["command"],
      },
      execute: async (args: Record<string, unknown>) => {
        const v = validateCommand(args.command);
        if (!v.valid) return { text: `Invalid command: ${v.error}` };

        const result = await dispatchAgent(dir, args.command as string);
        if (!result.success) {
          return { text: `Dispatch failed: ${result.error}` };
        }
        return {
          text: `Dispatched to agent "${result.agent}" in phase "${result.phase}" (${result.description})`,
        };
      },
    },
    {
      name: "prides_run_phase",
      description:
        "Run the full agent sequence for the current (or specified) phase",
      parameters: {
        type: "object",
        properties: {
          project: {
            type: "string",
            description: "Project name",
          },
          phase: {
            type: "string",
            description:
              "Phase to run (defaults to project's current phase): " +
              PHASE_ORDER.join(", "),
          },
          input: {
            type: "string",
            description: "Input brief passed to each agent step",
          },
        },
        required: ["project"],
      },
      execute: async (args: Record<string, unknown>) => {
        const v = validateProjectId(args.project);
        if (!v.valid) return { text: `Invalid project ID: ${v.error}` };

        const project = args.project as string;
        const workflow = await loadWorkflow(dir, project);
        if (!workflow) {
          return { text: `No PRIDES project found. Run prides_init first.` };
        }

        const phase = (args.phase as string) || workflow.currentPhase;
        const runner = getPhaseRunner(phase);
        if (!runner) {
          return { text: `Unknown phase: ${phase}` };
        }

        const brief = (args.input as string) || `Phase ${phase} execution`;
        const { results } = await runPhase(dir, phase, brief);

        const lines = results.map(
          (r, i) =>
            `Step ${i + 1}/${runner.sequence.length} (${runner.sequence[i]?.agent ?? "?"}): ${
              r.success ? "OK" : "FAILED" + (r.error ? " — " + r.error : "")
            }`
        );
        return {
          text: `Ran phase "${phase}" for project "${project}":\n${lines.join("\n")}`,
        };
      },
    },
    {
      name: "prides_status",
      description: "Show current PRIDES workflow status",
      parameters: {
        type: "object",
        properties: {
          project: {
            type: "string",
            description: "Project name",
          },
        },
        required: ["project"],
      },
      execute: async (args: Record<string, unknown>) => {
        const v = validateProjectId(args.project);
        if (!v.valid) return { text: `Invalid project ID: ${v.error}` };

        const project = args.project as string;
        const workflow = await loadWorkflow(dir, project);
        if (!workflow) {
          return {
            text: `No PRIDES project found. Run prides_init to create one.`,
          };
        }
        const agents = getAgentsByPhase(workflow.currentPhase);
        const runner = getPhaseRunner(workflow.currentPhase);
        const phaseSteps = runner ? runner.sequence.length : 0;
        return {
          text: `Project: ${workflow.projectId}\nCurrent phase: ${workflow.currentPhase} (${workflow.phases[workflow.currentPhase]})\nAgents in phase (${agents.length}): ${agents.map((a) => a.name).join(", ")}\nSequence steps: ${phaseSteps}\nPhase statuses: ${Object.entries(workflow.phases).map(([k, val]) => `${k}: ${val}`).join(", ")}`,
        };
      },
    },
    {
      name: "prides_advance",
      description: "Advance the workflow to the next phase",
      parameters: {
        type: "object",
        properties: {
          project: {
            type: "string",
            description: "Project name",
          },
        },
        required: ["project"],
      },
      execute: async (args: Record<string, unknown>) => {
        const v = validateProjectId(args.project);
        if (!v.valid) return { text: `Invalid project ID: ${v.error}` };

        const project = args.project as string;
        const workflow = await loadWorkflow(dir, project);
        if (!workflow) {
          return {
            text: `No PRIDES project found. Run prides_init first.`,
          };
        }
        const nextPhase = await advancePhase(dir, project);
        if (!nextPhase) {
          return { text: `All phases complete! Project "${project}" is done.` };
        }
        return {
          text: `Advanced to phase: ${nextPhase}`,
        };
      },
    },
    {
      name: "prides_agents",
      description: "List all PRIDES agents and their phases",
      parameters: {
        type: "object",
        properties: {},
      },
      execute: async () => {
        const lines = Object.entries(AGENTS).map(
          ([id, agent]) =>
            `${agent.phase}/${id}: ${agent.name} - ${agent.description} (temp: ${agent.temperature})`
        );
        return { text: `PRIDES Agents (${Object.keys(AGENTS).length} total):\n\n${lines.join("\n")}` };
      },
    },
    {
      name: "prides_log",
      description: "View pipeline execution logs",
      parameters: {
        type: "object",
        properties: {
          level: {
            type: "string",
            description: "Filter by level: debug, info, warn, error",
          },
          agent: {
            type: "string",
            description: "Filter by agent name",
          },
        },
      },
      execute: async (args: Record<string, unknown>) => {
        const entries = logger.getEntries();
        const filtered = entries.filter((e) => {
          if (args.level && e.level !== args.level) return false;
          if (args.agent && e.agent !== args.agent) return false;
          return true;
        });
        const summary = logger.getSummary();
        const lines = filtered.slice(-20).map(
          (e) => `[${e.timestamp}] [${e.level}] ${e.agent}: ${e.message}`
        );
        return {
          text: `Pipeline Logs (Trace: ${logger.getTraceId()})\nSteps: ${summary.totalSteps} | Tokens: ${summary.totalTokens} | Errors: ${summary.errors}\n\n${lines.join("\n") || "No logs found"}`,
        };
      },
    },
    {
      name: "prides_budget",
      description: "View token budget status and cost tracking",
      parameters: {
        type: "object",
        properties: {},
      },
      execute: async () => {
        const status = budget.getStatus();
        const alerts = budget.getAlerts();
        const agentLines = Object.entries(status.perAgent).map(
          ([agent, data]) =>
            `  ${agent}: ${data.used.toLocaleString()} tokens ($${data.cost.toFixed(4)})`
        );
        return {
          text: `Token Budget Status\nTotal: ${status.totalUsed.toLocaleString()} / ${status.totalBudget.toLocaleString()} (${status.percentUsed.toFixed(1)}%)\nCost: $${status.costSoFar.toFixed(4)}\n\nPer Agent:\n${agentLines.join("\n") || "  No usage yet"}\n\n${alerts.length > 0 ? "Alerts:\n" + alerts.map((a) => `  - ${a}`).join("\n") : ""}`,
        };
      },
    },
    {
      name: "prides_memory",
      description: "Search pipeline memory (per-agent, shared, global)",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query",
          },
          scope: {
            type: "string",
            description: "Memory scope: agent, shared, global (default: all)",
          },
          agent: {
            type: "string",
            description: "Agent name (required for agent scope)",
          },
        },
        required: ["query"],
      },
      execute: async (args: Record<string, unknown>) => {
        const query = args.query as string;
        const scope = (args.scope as string) || "all";
        const results: string[] = [];

        if (scope === "all" || scope === "agent") {
          if (args.agent) {
            const agentResults = memory.searchAgent(args.agent as string, query);
            results.push(`Agent Memory (${args.agent}): ${agentResults.length} results`);
            agentResults.slice(0, 5).forEach((r) => results.push(`  - ${r.key}: ${JSON.stringify(r.value)}`));
          }
        }
        if (scope === "all" || scope === "shared") {
          const sharedResults = memory.searchShared(query);
          results.push(`Shared Memory: ${sharedResults.length} results`);
          sharedResults.slice(0, 5).forEach((r) => results.push(`  - ${r.key}: ${JSON.stringify(r.value)}`));
        }
        if (scope === "all" || scope === "global") {
          const globalResults = memory.searchGlobal(query);
          results.push(`Global Memory: ${globalResults.length} results`);
          globalResults.slice(0, 5).forEach((r) => results.push(`  - ${r.key}: ${JSON.stringify(r.value)}`));
        }

        return { text: results.join("\n") || "No results found" };
      },
    },
    {
      name: "prides_conflicts",
      description: "View and resolve agent conflicts",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            description: "Action: list, resolve, merge",
          },
          topic: {
            type: "string",
            description: "Conflict topic",
          },
          method: {
            type: "string",
            description: "Resolution method: majority, weighted, confidence, tiebreak",
          },
        },
        required: ["action"],
      },
      execute: async (args: Record<string, unknown>) => {
        const action = args.action as string;

        if (action === "list") {
          const unresolved = conflictResolver.getUnresolvedConflicts();
          return { text: `Unresolved conflicts: ${unresolved.length > 0 ? unresolved.join(", ") : "None"}` };
        }

        if (action === "resolve" && args.topic) {
          const resolution = conflictResolver.resolve(args.topic as string, args.method as any);
          if (!resolution) return { text: `No conflict found for topic: ${args.topic}` };
          return {
            text: `Conflict Resolved: ${resolution.topic}\nWinner: ${resolution.winner}\nMethod: ${resolution.method}\nConfidence: ${(resolution.confidence * 100).toFixed(1)}%\nVotes: ${resolution.votes.length}`,
          };
        }

        if (action === "merge" && args.topic) {
          const merged = conflictResolver.mergeDecisions(args.topic as string);
          return { text: merged ? `Merged decision: ${merged}` : "No decisions to merge" };
        }

        return { text: "Invalid action. Use: list, resolve [topic], merge [topic]" };
      },
    },
    {
      name: "prides_plan",
      description: "View and manage adaptive plans",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            description: "Action: list, progress, backtrack, next",
          },
          planId: {
            type: "string",
            description: "Plan ID",
          },
          stepId: {
            type: "string",
            description: "Step ID (for backtrack)",
          },
        },
        required: ["action"],
      },
      execute: async (args: Record<string, unknown>) => {
        const action = args.action as string;

        if (action === "list") {
          return { text: "Plan management requires a plan ID. Use prides_init to create a project plan." };
        }

        if (action === "progress" && args.planId) {
          const progress = planner.getProgress(args.planId as string);
          return { text: `Plan Progress: ${progress.completed}/${progress.total} (${progress.percent.toFixed(1)}%)` };
        }

        if (action === "backtrack" && args.planId && args.stepId) {
          const success = planner.backtrack(args.planId as string, args.stepId as string);
          return { text: success ? "Backtrack successful" : "Backtrack failed (limit reached or invalid step)" };
        }

        if (action === "next" && args.planId) {
          const step = planner.getNextStep(args.planId as string);
          if (!step) return { text: "No pending steps" };
          return { text: `Next Step: ${step.id} - ${step.action} (Agent: ${step.agent})` };
        }

        return { text: "Invalid action. Use: list, progress [planId], backtrack [planId, stepId], next [planId]" };
      },
    },
  ];

  return {
    name: "prides",
    tools,
  };
}