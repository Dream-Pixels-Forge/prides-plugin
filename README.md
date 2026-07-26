# prides-plugin

A multi-agent orchestration plugin for [opencode](https://opencode.ai) that implements the **PRIDES** methodology — **P**rototype, **R**eview, **I**mplement, **D**eploy, **E**xtend, **S**ecure — for complete software development lifecycle management.

PRIDES coordinates 20 specialized subagents across 6 phases, managing project state, dispatching tasks, and running each phase's agent sequence automatically.

## Installation

### From GitHub

```bash
# Clone the plugin
git clone https://github.com/Dream-Pixels-Forge/prides-plugin.git ~/.config/opencode/plugins/prides-plugin

# Install dependencies and build
cd ~/.config/opencode/plugins/prides-plugin
bun install
bun run build
```

### From Local Files

Copy this directory to one of:

- **Project-level:** `.opencode/plugins/prides-plugin/`
- **Global:** `~/.config/opencode/plugins/prides-plugin/`

Then install and build:

```bash
cd <plugin-directory>
bun install
bun run build
```

### From npm (coming soon)

Add to your `opencode.json`:

```json
{
  "plugin": ["prides"]
}
```

OpenCode automatically installs npm plugins using Bun at startup.

---

## Configuration

The plugin registers itself via `.opencode/opencode.json`. To customize the PRIDES agent, add this to your project's `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "agent": {
    "prides": {
      "description": "Master coordinator — orchestrates Prototype, Review, Implement, Deploy, Extend, Secure phases",
      "mode": "primary",
      "temperature": 0.3,
      "color": "#6366f1",
      "tools": {
        "write": true,
        "edit": true,
        "bash": true
      },
      "permission": {
        "task": {
          "*": "allow"
        }
      }
    }
  }
}
```

## How It Works

```
User Request
    │
    ▼
┌─────────────────────────────────────────────────┐
│  PRIDES (Master Orchestrator)                   │
│  Coordinates phases, manages state, delegates   │
└─────────────────────────────────────────────────┘
    │
    ├─── PROTOTYPE ─── idea → analyst → prd → plan → agent
    │
    ├─── REVIEW ────── critic → inspector → git-expert → silent-failure-hunter
    │
    ├─── IMPLEMENT ─── features → uiux → coder → debugger → linter → tasks
    │
    ├─── DEPLOY ────── agent → performance
    │
    ├─── EXTEND ────── architect
    │
    └─── SECURE ────── agent → architect
```

Each phase runs a sequence of specialized agents. The orchestrator tracks progress and advances automatically.

## Commands

| Command | Description |
|---------|-------------|
| `/init` | Initialize a new PRIDES project |
| `/start-sprint` | Begin a development sprint |
| `/new-feature` | Start a new feature workflow |
| `/bug-fix` | Initiate a bug fix workflow |
| `/review` | Run code review |
| `/review-pr` | Comprehensive PR review |
| `/refactor` | Start a refactoring workflow |
| `/deploy` | Deploy the project |
| `/prototype` | Run the prototype phase |
| `/extend` | Run the extend phase |
| `/test-unit` | Run unit tests |
| `/test-e2e` | Run end-to-end tests |
| `/push-it` | Push changes with review |
| `/audit-security` | Security audit |
| `/audit-performance` | Performance audit |
| `/audit-dependencies` | Dependency audit |
| `/audit-functionality` | Functionality audit |

## Tools

The plugin exposes 6 tools to the opencode host:

| Tool | Description |
|------|-------------|
| `prides_init` | Initialize a new PRIDES project in the workspace |
| `prides_dispatch` | Dispatch a single task to the appropriate agent by command name |
| `prides_run_phase` | Run the full agent sequence for the current (or specified) phase |
| `prides_status` | Show current PRIDES workflow status |
| `prides_advance` | Advance the workflow to the next phase |
| `prides_agents` | List all 20 PRIDES agents and their phases |

## Agents

### Master

| Agent | Role |
|-------|------|
| `prides` | Master orchestrator — coordinates all phases and agents |

### Prototype Phase

| Agent | Role |
|-------|------|
| `prototype-idea` | Creative brainstorming and concept generation |
| `prototype-analyst` | Requirements analysis and feasibility assessment |
| `prototype-prd` | Product Requirements Document creation |
| `prototype-plan` | Implementation planning and architecture |
| `prototype-agent` | Rapid prototyping and proof-of-concept development |

### Review Phase

| Agent | Role |
|-------|------|
| `review-critic` | Critical analysis and constructive feedback |
| `review-inspector` | Code quality and QA inspection |
| `review-git-expert` | Version control and repository management |
| `review-silent-failure-hunter` | Silent failure and error handling detection |

### Implement Phase

| Agent | Role |
|-------|------|
| `implement-features` | Feature integration and coordination |
| `implement-uiux` | User interface and experience design |
| `implement-coder` | Core functionality implementation |
| `implement-debugger` | Bug identification and resolution |
| `implement-linter` | Code quality and style enforcement |
| `implement-tasks` | Task management and workflow coordination |

### Deploy Phase

| Agent | Role |
|-------|------|
| `deploy-agent` | Deployment and infrastructure management |
| `deploy-performance` | Performance optimization and monitoring |

### Extend Phase

| Agent | Role |
|-------|------|
| `extend-architect` | Architecture scalability and future-proofing |

### Secure Phase

| Agent | Role |
|-------|------|
| `secure-agent` | Security audits and vulnerability assessment |
| `secure-architect` | Secure architecture design and patterns |

## Development

```bash
bun test          # Run all tests (112 tests, 639 assertions)
bun run build     # Bundle to dist/
bun run lint      # TypeScript type check
bun run format    # Format source with Prettier
```

## Architecture

```
src/
├─ index.ts         Plugin entry point
├─ types.ts         Shared TypeScript types
├─ constants.ts     20 agent definitions + 6 phase definitions
├─ workflow.ts      State machine (persisted to .prides/<project>/state.json)
├─ orchestrator.ts  Project state detection
├─ dispatch.ts      Command → agent routing
├─ validation.ts    Input validation (prevents path traversal)
└─ workflows/
   ├─ base.ts       Shared workflow runner factory
   ├─ registry.ts   Phase routing and execution
   ├─ prototype.ts  5-step prototype sequence
   ├─ review.ts     4-step review sequence
   ├─ implement.ts  6-step implementation sequence
   ├─ deploy.ts     2-step deployment sequence
   ├─ extend.ts     1-step extension sequence
   └─ secure.ts     2-step security sequence
```

## State Persistence

Workflow state is saved to `<workspace>/.prides/<projectId>/state.json`. Each phase's step results are logged to `<workspace>/.prides/<phase>-steps.json`.

## License

MIT
