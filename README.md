# prides-plugin

A [PRIDES](docs/PRIDES-AGENTS.md)-method multi-agent plugin for [opencode](https://opencode.ai).

PRIDES orchestrates 20 specialized subagents across 6 phases — **P**rototype, **R**eview, **I**mplement, **D**eploy, **E**xtend, **S**ecure — managing project state, dispatching tasks, and running each phase's agent sequence.

## Install

```bash
bun install
bun run build
```

Register with opencode by placing this directory in your `plugins/` folder (the included `.opencode/opencode.json` handles registration).

## Tools

The plugin exposes 6 tools to the opencode host:

| Tool | Description |
| --- | --- |
| `prides_init` | Initialize a new PRIDES project in the workspace |
| `prides_dispatch` | Dispatch a single task to the appropriate agent by command name |
| `prides_run_phase` | Run the full agent sequence for the current (or specified) phase |
| `prides_status` | Show current PRIDES workflow status |
| `prides_advance` | Advance the workflow to the next phase |
| `prides_agents` | List all 20 PRIDES agents and their phases |

## Architecture

```
src/
├─ index.ts         Plugin entry point — exports pridesPlugin({ directory }) -> { name, tools }
├─ types.ts         Shared TypeScript types
├─ constants.ts     20 agent definitions + 6 phase definitions + helpers
├─ workflow.ts      State machine: create/load/save/advance (persisted to .prides/<project>/state.json)
├─ orchestrator.ts  Project state detection (new vs existing)
├─ dispatch.ts      Command → agent routing (delegates to workflow registry)
├─ validation.ts    Project ID + command input validation (prevents path traversal)
└─ workflows/
   ├─ base.ts       createWorkflowRunner(step[], logFile) factory (shared by all phases)
   ├─ registry.ts   Phase-name → runner index; getRunnerForCommand/Agent; runPhase()
   ├─ prototype.ts  5-step sequence: idea → analyst → prd → plan → agent
   ├─ review.ts     4-step sequence: critic → inspector → git → silent-failure
   ├─ implement.ts  6-step sequence: features → uiux → coder → debugger → linter → tasks
   ├─ deploy.ts     2-step sequence: agent → performance
   ├─ extend.ts     1-step sequence: architect
   └─ secure.ts     2-step sequence: agent → architect
```

## Development

```bash
bun test          # run all tests
bun run build     # bundle to dist/
bun run lint      # tsc --noEmit
bun run format    # prettier --write src
```

The project uses strict TDD: every module has a corresponding `tests/*.test.ts` file. Test artifacts (`.test-*/`, `.prides/`) are gitignored.

## State persistence

Workflow state is persisted to `<workspaceDir>/.prides/<projectId>/state.json`. Each phase's step results are logged to `<workspaceDir>/.prides/<phase>-steps.json`. Project IDs are validated to `^[a-zA-Z0-9_-]+$` to prevent path traversal.

## License

MIT