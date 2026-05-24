---
name: spec-driven
description: Spec-driven development workflow. Propose → Apply → Archive cycle with living documentation. Triggers on: spec, proposal, design doc, new feature planning, architecture decision.
disable-model-invocation: false
context: fork
---

# Spec-Driven Development

Three-step cycle: Propose → Apply → Archive. Bad decisions get caught on paper where they're cheap.

## Core Principle

> "Stop prompting. Propose → refine → apply. Bad decisions caught on paper where cheap."

The spec grows with the project. Each cycle compounds knowledge.

## When to Use

- Starting a new feature (complex enough for a design doc)
- Making architecture decisions
- Planning work that spans multiple agents
- Any task where "what could go wrong?" matters

## The Three Steps

### Step 1: Propose

Start with a vague idea. Refine it through exploration:

1. Create `.prides/specs/<feature-name>/proposal.md` — what to build
2. Create `.prides/specs/<feature-name>/design.md` — granular decisions
3. Create `.prides/specs/<feature-name>/tasks.md` — checklist

**proposal.md** covers:
- Problem statement
- Proposed solution
- Alternatives considered
- Success criteria
- Out of scope

**design.md** covers:
- Data models
- API contracts
- Component architecture
- Integration points
- Edge cases
- Error handling strategy

**tasks.md** covers:
- Numbered checklist of implementation steps
- Dependencies between tasks
- Acceptance criteria per task
- Estimated complexity (S/M/L)

### Step 2: Apply

Hand the spec to implementation agents:

1. Agent reads `proposal.md`, `design.md`, `tasks.md`
2. Works through tasks one by one
3. Checks off completed tasks
4. Reports blockers in `tasks.md` under a Blockers section
5. Mid-task pausing is fine — progress saved in `tasks.md`

**Guardrail adjustment**:
- Pause → update rules/guardrails → resume
- Agent picks up from next open task
- Rules changes apply immediately

### Step 3: Archive

Fold completed work into living documentation:

1. Move completed spec to `.prides/specs/archive/`
2. Update project-level documentation with decisions made
3. Add entry to `.prides/specs/INDEX.md` with date, feature, outcome
4. Lessons learned → update rules files

## Scripts

All scripts accept an optional `PROJECT_ROOT` argument (defaults to `$PWD`):

```bash
# Initialize a new spec
./scripts/init-spec.sh <feature-name> "<description>" [PROJECT_ROOT]
```

## Spec Commands

### /spec:propose <feature>
Create proposal, design, and task files for a new feature.

### /spec:status <feature>
Show task completion progress.

### /spec:apply <feature>
Start/resume implementation from tasks.md.

### /spec:archive <feature>
Archive completed spec and update living docs.

### /spec:list
List all active and archived specs.

## Living Documentation

The `.prides/specs/` directory grows over time:

```
.prides/specs/
├── INDEX.md              # Registry of all specs
├── auth-system/          # Active spec
│   ├── proposal.md
│   ├── design.md
│   └── tasks.md
├── payment-flow/         # Active spec
│   ├── proposal.md
│   ├── design.md
│   └── tasks.md
└── archive/              # Completed specs
    └── user-onboarding/
        ├── proposal.md
        ├── design.md
        ├── tasks.md
        └── OUTCOME.md    # What actually happened
```

## Rules

1. **Spec before code** — Don't start coding without a spec
2. **Refine until clear** — If an agent could guess wrong, the spec isn't done
3. **Tasks are vertical slices** — Each task spans all layers
4. **Archive with outcome** — Document what actually happened vs what was planned
5. **Decisions compound** — Each archived spec makes the next one better
