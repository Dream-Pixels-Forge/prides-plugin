#!/usr/bin/env bash
# uninstall.sh — Remove PRIDES from OpenCode config
# Usage: ./uninstall.sh [OPENCODE_CONFIG_DIR]

set -uo pipefail

CONFIG_DIR="${1:-$HOME/.config/opencode}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=== PRIDES Uninstaller ===${NC}"
echo "Config dir: $CONFIG_DIR"
echo ""

# Remove plugin
echo -n "Removing plugin... "
rm -f "$CONFIG_DIR/plugins/swarm/index.js"
rmdir "$CONFIG_DIR/plugins/swarm" 2>/dev/null || true
echo -e "${GREEN}done${NC}"

# Remove agents
echo -n "Removing agents... "
rm -rf "$CONFIG_DIR/agents/prides"
echo -e "${GREEN}done${NC}"

# Remove rules (only PRIDES rules)
echo -n "Removing PRIDES rules... "
for f in prototype-rules.md review-rules.md implement-rules.md deploy-rules.md extend-rules.md secure-rules.md gate-rules.md; do
  rm -f "$CONFIG_DIR/rules/$f"
done
echo -e "${GREEN}done${NC}"

# Remove skills
echo -n "Removing skills... "
rm -rf "$CONFIG_DIR/skills/planning-with-files"
rm -rf "$CONFIG_DIR/skills/spec-driven"
echo -e "${GREEN}done${NC}"

# Remove scripts
echo -n "Removing scripts... "
rm -f "$CONFIG_DIR/scripts/validate-phase.sh"
rm -f "$CONFIG_DIR/scripts/heartbeat-check.sh"
rm -f "$CONFIG_DIR/scripts/context-prepare.sh"
rm -f "$CONFIG_DIR/scripts/state-snapshot.sh"
echo -e "${GREEN}done${NC}"

echo ""
echo -e "${GREEN}=== Uninstallation Complete ===${NC}"
echo ""
echo "Don't forget to remove the plugin from your opencode.jsonc:"
echo "  Delete: \"file://$CONFIG_DIR/plugins/swarm/index.js\""
echo ""
echo "Note: .prides/ directories in your projects were NOT removed."
echo "Remove them manually if desired: rm -rf .prides"
