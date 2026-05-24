#!/usr/bin/env bash
# init.sh — Initialize a new planning session
# Usage: ./scripts/init.sh <task-slug> <task-description> [PROJECT_ROOT]
#
# If PROJECT_ROOT is not given, uses $PWD.

set -uo pipefail

SLUG="${1:?Usage: init.sh <task-slug> <task-description> [PROJECT_ROOT]}"
DESC="${2:?Usage: init.sh <task-slug> <task-description> [PROJECT_ROOT]}"
PROJECT_ROOT="${3:-$PWD}"

PLAN_DIR="$PROJECT_ROOT/.prides/planning/$SLUG"

mkdir -p "$PLAN_DIR"

# task_plan.md
cat > "$PLAN_DIR/task_plan.md" << EOF
# Task Plan: $DESC

## Objective
$DESC

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
EOF

# findings.md
cat > "$PLAN_DIR/findings.md" << EOF
# Findings: $DESC

## Research
<!-- Document discoveries here -->

## API References
<!-- Relevant API docs, endpoints, schemas -->

## Architecture Decisions
<!-- Why we chose approach X over Y -->

## Code Patterns
<!-- Existing patterns in the codebase to follow -->
EOF

# progress.md
cat > "$PLAN_DIR/progress.md" << EOF
# Progress Log: $DESC

## Session 1 — $(date -u +%Y-%m-%dT%H:%M:%SZ)
- Initialized planning session
- Created task_plan.md, findings.md, progress.md

## Errors & Attempts
<!-- Track what didn't work and why -->

## Test Results
<!-- Paste test output here -->
EOF

echo "Planning session initialized: $PLAN_DIR"
echo "Project: $PROJECT_ROOT"
echo ""
echo "Files created:"
ls -la "$PLAN_DIR/"
