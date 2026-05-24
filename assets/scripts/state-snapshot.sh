#!/usr/bin/env bash
# state-snapshot.sh — Capture immutable PRIDES phase state snapshot
# Usage: ./scripts/state-snapshot.sh <PHASE> [LABEL] [PROJECT_ROOT]
# Example: ./scripts/state-snapshot.sh I "after-auth-merge" /path/to/project
#
# If PROJECT_ROOT is not given, uses $PWD.

set -uo pipefail
# NOTE: no -e — git commands may fail on new/non-git projects

PHASE="${1:?Usage: state-snapshot.sh <PHASE> [LABEL] [PROJECT_ROOT]}"
LABEL="${2:-}"
PROJECT_ROOT="${3:-$PWD}"
SNAPSHOT_DIR="$PROJECT_ROOT/.prides/snapshots/$PHASE"

mkdir -p "$SNAPSHOT_DIR"

# Find next version
EXISTING=$(find "$SNAPSHOT_DIR" -name "v*.json" 2>/dev/null | wc -l || echo "0")
VERSION=$((EXISTING + 1))

if [ -n "$LABEL" ]; then
  FILENAME="v${VERSION}-${LABEL}.json"
else
  FILENAME="v${VERSION}.json"
fi

SNAPSHOT_FILE="$SNAPSHOT_DIR/$FILENAME"

echo "Capturing snapshot: $PHASE/$FILENAME"
echo "Project: $PROJECT_ROOT"
echo ""

{
  echo "{"
  echo "  \"version\": $VERSION,"
  echo "  \"phase\": \"$PHASE\","
  echo "  \"label\": $( [ -n "$LABEL" ] && echo "\"$LABEL\"" || echo "null" ),"
  echo "  \"created\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
  echo "  \"project\": \"$PROJECT_ROOT\","
  echo "  \"immutable\": true,"
  echo "  \"data\": {"

  # Git state
  echo "    \"git\": {"
  if command -v git &>/dev/null && git -C "$PROJECT_ROOT" rev-parse --git-dir &>/dev/null 2>&1; then
    echo "      \"branch\": \"$(git -C "$PROJECT_ROOT" branch --show-current 2>/dev/null || echo "none")\","
    echo "      \"commit\": \"$(git -C "$PROJECT_ROOT" rev-parse HEAD 2>/dev/null || echo "none")\","
    echo "      \"dirty\": $(git -C "$PROJECT_ROOT" diff --quiet 2>/dev/null && echo "false" || echo "true")"
  else
    echo "      \"branch\": \"none\","
    echo "      \"commit\": \"none\","
    echo "      \"dirty\": false"
  fi
  echo "    },"

  # File counts
  echo "    \"files\": {"
  echo "      \"total\": $(find "$PROJECT_ROOT" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.prides/*" 2>/dev/null | wc -l || echo "0"),"
  echo "      \"source\": $(find "$PROJECT_ROOT" -type f \( -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" \) -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | wc -l || echo "0")"
  echo "    },"

  # Dependencies
  echo "    \"dependencies\": {"
  if [ -f "$PROJECT_ROOT/package.json" ] && command -v python3 &>/dev/null; then
    echo "      \"npm\": $(python3 -c "import json; d=json.load(open('$PROJECT_ROOT/package.json')); print(len(d.get('dependencies',{})))" 2>/dev/null || echo "0")"
  elif [ -f "$PROJECT_ROOT/package.json" ]; then
    echo "      \"npm\": \"unknown (python3 not available)\""
  else
    echo "      \"npm\": 0"
  fi
  echo "    }"

  echo "  }"
  echo "}"
} > "$SNAPSHOT_FILE"

echo "Snapshot saved to: $SNAPSHOT_FILE"
echo "Size: $(wc -c < "$SNAPSHOT_FILE") bytes"
echo ""
echo "This is an immutable record. Do not modify."
echo "Next snapshot will be v$((VERSION + 1))."
