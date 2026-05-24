#!/usr/bin/env bash
# check.sh — Check planning session progress
# Usage: ./scripts/check.sh [task-slug] [PROJECT_ROOT]
#
# If PROJECT_ROOT is not given, uses $PWD.
# If no slug given, shows all active sessions.

set -uo pipefail

SLUG="${1:-}"
PROJECT_ROOT="${2:-$PWD}"
PLAN_BASE="$PROJECT_ROOT/.prides/planning"

if [ ! -d "$PLAN_BASE" ]; then
  echo "No planning sessions found in: $PROJECT_ROOT"
  echo "Run init.sh to create one."
  exit 0
fi

if [ -n "$SLUG" ]; then
  PLAN_DIR="$PLAN_BASE/$SLUG"
  if [ ! -d "$PLAN_DIR" ]; then
    echo "No planning session found for: $SLUG"
    echo ""
    echo "Available sessions:"
    ls "$PLAN_BASE/" 2>/dev/null || echo "  (none)"
    exit 1
  fi

  echo "=== Planning Session: $SLUG ==="
  echo "Project: $PROJECT_ROOT"
  echo ""

  # Count checkboxes
  if [ -f "$PLAN_DIR/task_plan.md" ]; then
    TOTAL=$(grep -c "\- \[.\]" "$PLAN_DIR/task_plan.md" 2>/dev/null || echo "0")
    DONE=$(grep -c "\- \[x\]" "$PLAN_DIR/task_plan.md" 2>/dev/null || echo "0")
    # Clean whitespace
    TOTAL=$(echo "$TOTAL" | tr -d '[:space:]')
    DONE=$(echo "$DONE" | tr -d '[:space:]')
    [ -z "$TOTAL" ] && TOTAL=0
    [ -z "$DONE" ] && DONE=0
    OPEN=$((TOTAL - DONE))
    echo "Progress: $DONE/$TOTAL completed ($OPEN remaining)"
    echo ""

    # Show open items
    if [ "$OPEN" -gt 0 ]; then
      echo "Open items:"
      grep "\- \[ \]" "$PLAN_DIR/task_plan.md" | head -10
      echo ""
    fi
  fi

  # Show last progress entries
  if [ -f "$PLAN_DIR/progress.md" ]; then
    echo "Recent activity:"
    tail -10 "$PLAN_DIR/progress.md"
  fi
else
  echo "=== Active Planning Sessions ==="
  echo "Project: $PROJECT_ROOT"
  echo ""
  for dir in "$PLAN_BASE"/*/; do
    [ -d "$dir" ] || continue
    name=$(basename "$dir")
    if [ -f "$dir/task_plan.md" ]; then
      TOTAL=$(grep -c "\- \[.\]" "$dir/task_plan.md" 2>/dev/null || echo "0")
      DONE=$(grep -c "\- \[x\]" "$dir/task_plan.md" 2>/dev/null || echo "0")
      TOTAL=$(echo "$TOTAL" | tr -d '[:space:]')
      DONE=$(echo "$DONE" | tr -d '[:space:]')
      [ -z "$TOTAL" ] && TOTAL=0
      [ -z "$DONE" ] && DONE=0
      echo "  $name: $DONE/$TOTAL done"
    else
      echo "  $name: (no plan file)"
    fi
  done
fi
