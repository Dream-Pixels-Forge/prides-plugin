#!/usr/bin/env bash
# context-prepare.sh — Build context files for PRIDES subagent delegation
# Usage: ./scripts/context-prepare.sh <PHASE> <TASK_NAME> [PROJECT_ROOT]
# Example: ./scripts/context-prepare.sh I "implement-auth" /path/to/project
#
# If PROJECT_ROOT is not given, uses $PWD.

set -uo pipefail
# NOTE: no -e — git commands may fail on new/non-git projects

PHASE="${1:?Usage: context-prepare.sh <PHASE> <TASK_NAME> [PROJECT_ROOT]}"
TASK="${2:?Usage: context-prepare.sh <PHASE> <TASK_NAME> [PROJECT_ROOT]}"
PROJECT_ROOT="${3:-$PWD}"
CONTEXT_DIR="$PROJECT_ROOT/.prides/context/$PHASE"
CONTEXT_FILE="$CONTEXT_DIR/${TASK}.md"

mkdir -p "$CONTEXT_DIR"

echo "Building context file: $CONTEXT_FILE"
echo "Project: $PROJECT_ROOT"
echo ""

{
  echo "# Context: $TASK"
  echo ""
  echo "**Phase:** $PHASE"
  echo "**Generated:** $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "**Project:** $PROJECT_ROOT"
  echo ""
  echo "## Project Structure"
  echo ""
  echo '```'
  find "$PROJECT_ROOT" -maxdepth 2 -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.prides/*" -not -path "*/.openclaude/*" 2>/dev/null | head -30
  echo '```'
  echo ""
  echo "## Key Files"
  echo ""

  # Detect and list key files
  found_any=false
  for f in package.json tsconfig.json Cargo.toml go.mod pyproject.toml Makefile Dockerfile docker-compose.yml .env.example README.md AGENTS.md; do
    if [ -f "$PROJECT_ROOT/$f" ]; then
      echo "- \`$f\`"
      found_any=true
    fi
  done
  if [ "$found_any" = false ]; then
    echo "(none detected)"
  fi

  echo ""
  echo "## Current Git Status"
  echo ""
  echo '```'
  if command -v git &>/dev/null && git -C "$PROJECT_ROOT" rev-parse --git-dir &>/dev/null 2>&1; then
    git -C "$PROJECT_ROOT" status --short 2>/dev/null || echo "git status unavailable"
  else
    echo "not a git repo"
  fi
  echo '```'

  echo ""
  echo "## Recent Changes"
  echo ""
  echo '```'
  if command -v git &>/dev/null && git -C "$PROJECT_ROOT" rev-parse --git-dir &>/dev/null 2>&1; then
    git -C "$PROJECT_ROOT" log --oneline -10 2>/dev/null || echo "no git history"
  else
    echo "not a git repo"
  fi
  echo '```'

  echo ""
  echo "## AGENTS.md Summary"
  echo ""
  if [ -f "$PROJECT_ROOT/AGENTS.md" ]; then
    head -50 "$PROJECT_ROOT/AGENTS.md"
  else
    echo "(no AGENTS.md found)"
  fi
} > "$CONTEXT_FILE"

echo "Context file written to: $CONTEXT_FILE"
echo "Size: $(wc -c < "$CONTEXT_FILE") bytes"
echo ""
echo "Reference this file when delegating to subagents:"
echo "  Use @swarm_context_read name=\"$TASK\" phase=\"$PHASE\""
