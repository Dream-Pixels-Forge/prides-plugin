#!/usr/bin/env bash
# init-spec.sh — Initialize a new spec-driven feature specification
# Usage: ./scripts/init-spec.sh <feature-name> "<description>" [PROJECT_ROOT]
#
# If PROJECT_ROOT is not given, uses $PWD.

set -uo pipefail

FEATURE="${1:?Usage: init-spec.sh <feature-name> <description> [PROJECT_ROOT]}"
DESC="${2:?Usage: init-spec.sh <feature-name> <description> [PROJECT_ROOT]}"
PROJECT_ROOT="${3:-$PWD}"

SPEC_DIR="$PROJECT_ROOT/.prides/specs/$FEATURE"

mkdir -p "$SPEC_DIR"

cat > "$SPEC_DIR/proposal.md" << EOF
# Proposal: $DESC

## Problem Statement
<!-- What problem are we solving? -->

## Proposed Solution
<!-- How will we solve it? -->

## Alternatives Considered
<!-- What else did we consider and why did we reject it? -->

## Success Criteria
<!-- How do we know when it's done? -->

## Out of Scope
<!-- What are we explicitly NOT doing? -->
EOF

cat > "$SPEC_DIR/design.md" << EOF
# Design: $DESC

## Data Models
<!-- Schemas, types, interfaces -->

## API Contracts
<!-- Endpoints, request/response formats -->

## Component Architecture
<!-- How pieces fit together -->

## Integration Points
<!-- External systems, APIs, databases -->

## Edge Cases
<!-- What could go wrong? -->

## Error Handling Strategy
<!-- How do we handle failures? -->
EOF

cat > "$SPEC_DIR/tasks.md" << EOF
# Tasks: $DESC

## Implementation Checklist

### Phase 1: Foundation
- [ ] Task 1
- [ ] Task 2

### Phase 2: Core
- [ ] Task 3
- [ ] Task 4

### Phase 3: Polish
- [ ] Task 5
- [ ] Task 6

## Blockers
<!-- List any blockers here -->

## Dependencies
<!-- Task dependency relationships -->
EOF

echo "Spec initialized: $SPEC_DIR"
echo "Project: $PROJECT_ROOT"
echo ""
ls -la "$SPEC_DIR/"
