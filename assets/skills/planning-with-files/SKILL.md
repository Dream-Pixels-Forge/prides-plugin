---
name: planning-with-files
description: Manus-style persistent markdown planning with 3-file pattern (task_plan.md, findings.md, progress.md). Use for multi-step tasks, research, building projects, or tasks spanning many tool calls. Triggers on: planning, multi-step task, research task, build project, complex implementation.
disable-model-invocation: false
context: fork
---

# Planning With Files

Persistent markdown planning inspired by Manus AI's working memory pattern.

## Core Principle

```
Context Window = RAM (volatile, limited)
Filesystem    = Disk (persistent, unlimited)

→ Anything important gets written to disk.
```

## When to Use

**Use for:**
- Multi-step tasks (3+ steps)
- Research tasks
- Building/creating projects
- Tasks spanning many tool calls
- Any task where session recovery matters

**Skip for:**
- Simple questions
- Single-file edits
- Quick lookups

## The 3-File Pattern

For every complex task, create THREE files in `.prides/planning/<task-slug>/`:

```
task_plan.md   → Track phases, progress, checkboxes, dependencies
findings.md    → Store research, discoveries, API references, decisions
progress.md    → Session log, test results, errors, attempts
```

## Scripts

All scripts accept an optional `PROJECT_ROOT` argument (defaults to `$PWD`):

```bash
# Initialize a planning session
./scripts/init.sh <task-slug> <task-description> [PROJECT_ROOT]

# Check progress across sessions
./scripts/check.sh [task-slug] [PROJECT_ROOT]
```

## Commands

### /planning:start <task-description>
Initialize a new planning session:
1. Create `.prides/planning/<task-slug>/` directory
2. Generate `task_plan.md` from task description
3. Create empty `findings.md` and `progress.md`
4. Log session start in `progress.md`

### /planning:status
Show progress at a glance:
- Count completed vs total checkboxes in `task_plan.md`
- Show last 5 entries from `progress.md`
- List any open blockers

### /planning:resume
Recover context after session break:
1. Find most recent planning session
2. Read `task_plan.md` for current phase
3. Read `progress.md` for last activity
4. Show catchup report

## Key Rules

1. **Create Plan First** — Never start without `task_plan.md`
2. **The 2-Action Rule** — Save findings after every 2 view/read operations
3. **Log ALL Errors** — They help avoid repetition in `progress.md`
4. **Never Repeat Failures** — Track attempts, mutate approach
5. **Checkboxes = Progress** — Use `- [ ]` and `- [x` in `task_plan.md`

## Template: task_plan.md

```markdown
# Task Plan: <task title>

## Objective
<what we're building and why>

## Phases

### Phase 1: Research & Discovery
- [ ] Identify requirements
- [ ] Research existing solutions
- [ ] Document findings in findings.md

### Phase 2: Design & Planning
- [ ] Define architecture
- [ ] List files to create/modify
- [ ] Identify dependencies

### Phase 3: Implementation
- [ ] Build core functionality
- [ ] Add tests
- [ ] Handle edge cases

### Phase 4: Verification
- [ ] Run tests
- [ ] Lint check
- [ ] Manual verification

## Blockers
<!-- List any blockers here -->

## Dependencies
<!-- List task dependencies between phases -->
```

## Template: findings.md

```markdown
# Findings: <task title>

## Research
<!-- Document discoveries here -->

## API References
<!-- Relevant API docs, endpoints, schemas -->

## Architecture Decisions
<!-- Why we chose approach X over Y -->

## Code Patterns
<!-- Existing patterns in the codebase to follow -->
```

## Template: progress.md

```markdown
# Progress Log: <task title>

## Session 1 — <date>
- Started task
- Created plan
- <actions taken>

## Errors & Attempts
<!-- Track what didn't work and why -->

## Test Results
<!-- Paste test output here -->
```
