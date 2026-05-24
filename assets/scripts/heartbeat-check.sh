#!/usr/bin/env bash
# heartbeat-check.sh — Check PRIDES agent cluster health
# Usage: ./scripts/heartbeat-check.sh [PHASE] [PROJECT_ROOT]
# Example: ./scripts/heartbeat-check.sh I /path/to/project
#
# If PROJECT_ROOT is not given, uses $PWD.

set -uo pipefail
# NOTE: no -e — handle missing dirs gracefully

PHASE="${1:-all}"
PROJECT_ROOT="${2:-$PWD}"
PRIDES_DIR="$PROJECT_ROOT/.prides"
HEARTBEAT_DIR="$PRIDES_DIR/heartbeat"
STATE_FILE="$PRIDES_DIR/state.json"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=== PRIDES Heartbeat Check ===${NC}"
echo "Project: $PROJECT_ROOT"
echo ""

# Check if .prides exists
if [ ! -d "$PRIDES_DIR" ]; then
  echo -e "${YELLOW}No .prides directory found.${NC}"
  echo "This is normal for new projects."
  echo "The directory will be created when the PRIDES coordinator starts."
  exit 0
fi

# Show state
if [ -f "$STATE_FILE" ]; then
  echo -e "${CYAN}Current State:${NC}"
  # Try python3 first, fall back to cat
  if command -v python3 &>/dev/null; then
    python3 -m json.tool "$STATE_FILE" 2>/dev/null || cat "$STATE_FILE"
  else
    cat "$STATE_FILE"
  fi
  echo ""
else
  echo -e "${YELLOW}No state.json found.${NC}"
  echo ""
fi

# Check heartbeat pulses
echo -e "${CYAN}Heartbeat Pulses:${NC}"
phases=("P" "R" "I" "D" "E" "S")
for p in "${phases[@]}"; do
  if [ "$PHASE" != "all" ] && [ "$PHASE" != "$p" ]; then
    continue
  fi
  pulse_file="$HEARTBEAT_DIR/${p}-pulse.log"
  if [ -f "$pulse_file" ]; then
    lines=$(wc -l < "$pulse_file")
    last=$(tail -1 "$pulse_file" 2>/dev/null)
    echo -e "  ${GREEN}[${p}]${NC} ${lines} pulses | Last: ${last}"
  else
    echo -e "  ${YELLOW}[${p}]${NC} No pulses recorded"
  fi
done

echo ""

# Check circuit breakers
if [ -f "$STATE_FILE" ] && command -v python3 &>/dev/null; then
  echo -e "${CYAN}Circuit Breakers:${NC}"
  python3 -c "
import json, sys
with open('$STATE_FILE') as f:
    state = json.load(f)
cbs = state.get('circuitBreakers', {})
if not cbs:
    print('  (none registered)')
else:
    for agent, cb in cbs.items():
        st = cb.get('state', 'unknown')
        fails = cb.get('failures', 0)
        color = '\033[0;32m' if st == 'closed' else '\033[0;31m' if st == 'open' else '\033[1;33m'
        nc = '\033[0m'
        print(f'  {color}{agent}{nc}: {st} (failures: {fails})')
" 2>/dev/null || echo "  (could not parse state)"
elif [ -f "$STATE_FILE" ]; then
  echo -e "${CYAN}Circuit Breakers:${NC}"
  echo "  (python3 not available for JSON parsing)"
fi

echo ""

# Check open issues
issue_dir="$PRIDES_DIR/issues"
if [ -d "$issue_dir" ]; then
  open_count=$(find "$issue_dir" -name "*.json" 2>/dev/null | while read -r f; do
    if grep -q '"status": "open"' "$f" 2>/dev/null; then echo "open"; fi
  done | wc -l || echo "0")
  total_count=$(find "$issue_dir" -name "*.json" 2>/dev/null | wc -l || echo "0")
  if [ "$open_count" -gt 0 ]; then
    echo -e "${YELLOW}Issues: ${open_count} open / ${total_count} total${NC}"
  else
    echo -e "${GREEN}Issues: all ${total_count} resolved${NC}"
  fi
else
  echo -e "${GREEN}Issues: none${NC}"
fi

echo ""

# Check incidents
incident_dir="$PRIDES_DIR/incidents"
if [ -d "$incident_dir" ]; then
  count=$(find "$incident_dir" -name "*.json" 2>/dev/null | wc -l || echo "0")
  if [ "$count" -gt 0 ]; then
    echo -e "${YELLOW}Incidents: ${count} recorded${NC}"
    find "$incident_dir" -name "*.json" -exec basename {} \; 2>/dev/null | tail -5
  else
    echo -e "${GREEN}No incidents recorded${NC}"
  fi
else
  echo -e "${GREEN}No incidents recorded${NC}"
fi

echo ""
echo -e "${CYAN}=== Heartbeat check complete ===${NC}"
