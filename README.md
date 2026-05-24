# prides-plugin

PRIDES methodology plugin for [OpenCode](https://github.com/sst/opencode) — a production-grade agentic workflow orchestration system.

**P**rototype → **R**eview → **I**mplement → **D**eploy → **E**xtend → **S**ecure

## What It Does

- **16 swarm tools** for orchestration: heartbeat, validation gates, issue tracking, context files, state snapshots, circuit breakers, memory decay
- **28 specialized agents** organized by PRIDES phase
- **7 path-scoped rules** that load only when relevant
- **2 workflow skills**: Manus-style planning, spec-driven development
- **4 automation scripts** for CLI-based validation and health checks
- **Autonomous loop agent** (Ralph) that works through open issues

## Install

```bash
# Clone and install
git clone https://github.com/Gitlawb/prides-plugin.git
cd prides-plugin
./install.sh

# Or with custom config dir
./install.sh /path/to/your/opencode/config
```

This copies agents, rules, skills, and scripts into your `~/.config/opencode/` directory.

## Configure

Add the plugin to your `opencode.jsonc`:

```jsonc
{
  "plugins": [
    "file://~/.config/opencode/plugins/swarm/index.js"
  ]
}
```

Restart OpenCode.

## Usage

### As Primary Agent

Set PRIDES as your primary agent in `opencode.jsonc`:

```jsonc
{
  "agents": {
    "primary": "prides"
  }
}
```

### On-Demand

Reference the coordinator in any session:

```
@prides Please build a user authentication system
```

### New Project Flow

```
1. Coordinator detects no code/git → starts at Prototype
2. @prides/prototype-idea → brainstorm
3. @prides/prototype-prd → write PRD
4. @prides/prototype-plan → architecture
5. @prides/gate-p-to-r → validation gate
6. @prides/review-inspector → code review
7. @prides/implement-coder → TDD implementation
8. @prides/ralph → autonomous issue resolution
9. @prides/deploy-agent → deployment
10. @prides/extend-architect → scaling
11. @prides/secure-agent → security audit
```

### Existing Project Flow

```
1. Coordinator detects code/git → starts at Review
2. @swarm_session_recover → catch up on prior state
3. @swarm_issue_list status="open" → check open issues
4. Resume from last position
```

## Swarm Tools

| Tool | Purpose |
|------|---------|
| `swarm_heartbeat` | Agent liveness + circuit breaker tracking |
| `swarm_gate` | Deterministic validation before phase transitions |
| `swarm_snapshot` | Immutable, versioned state snapshots |
| `swarm_context_write` | Write context files for subagent delegation |
| `swarm_context_read` | Read context files |
| `swarm_status` | Dashboard: phase, circuits, gates, issues |
| `swarm_incident` | Audit trail for failures |
| `swarm_mcp_gate` | Phase-aware MCP server recommendations |
| `swarm_transition` | Phase state machine with history |
| `swarm_issue_open` | Create tracking issue |
| `swarm_issue_close` | Close issue with resolution |
| `swarm_issue_comment` | Add progress comment |
| `swarm_issue_list` | Query issues by status/phase/severity |
| `swarm_session_recover` | Context recovery after session break |
| `swarm_decay` | Prune stale state, promote frequent items |
| `swarm_decay_track` | Register items for importance tracking |

## Architecture

```
.prides/                          ← Created per-project
├── state.json                    ← Phase state machine
├── heartbeat/{P,R,I,D,E,S}-pulse.log
├── incidents/                    ← Audit trail
├── issues/                       ← Tracking issues (ISS-0001.json)
├── snapshots/{P,R,I,D,E,S}/     ← Immutable state versions
├── context/{P,R,I,D,E,S}/       ← Context files for delegation
├── planning/                     ← Manus-style 3-file plans
│   └── <task-slug>/
│       ├── task_plan.md
│       ├── findings.md
│       └── progress.md
└── specs/                        ← Spec-driven documentation
    ├── INDEX.md
    └── <feature>/
        ├── proposal.md
        ├── design.md
        └── tasks.md
```

## Agents

| Phase | Agents |
|-------|--------|
| **P** Prototype | prototype-idea, prototype-analyst, prototype-prd, prototype-plan, prototype-agent |
| **R** Review | review-critic, review-inspector, review-git-expert |
| **I** Implement | implement-coder, implement-features, implement-uiux, implement-debugger, implement-linter, implement-tasks, ralph |
| **D** Deploy | deploy-agent, deploy-performance |
| **E** Extend | extend-architect |
| **S** Secure | secure-agent, secure-architect |
| **Gates** | gate-p-to-r, gate-r-to-i, gate-i-to-d, gate-d-to-e, gate-e-to-s, gate-s-to-done |

## Skills

- **planning-with-files** — Manus-style 3-file planning (task_plan.md, findings.md, progress.md)
- **spec-driven** — Propose → Apply → Archive cycle with living documentation

## Rules

Path-scoped rules that load only when relevant:
- `prototype-rules.md` — PRD structure, user stories
- `review-rules.md` — Inspection checklist, severity levels
- `implement-rules.md` — TDD cycle, vertical slices
- `deploy-rules.md` — Deployment checklist, rollback plans
- `extend-rules.md` — Architecture principles, ADR format
- `secure-rules.md` — OWASP checklist, secrets management
- `gate-rules.md` — Gate protocol, blocking issues

## Uninstall

```bash
./uninstall.sh
```

Then remove the plugin entry from your `opencode.jsonc`.

## License

MIT
