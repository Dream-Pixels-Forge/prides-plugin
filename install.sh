#!/usr/bin/env bash
# install.sh — Install PRIDES methodology into OpenCode config
# Usage: ./install.sh [OPENCODE_CONFIG_DIR]
#
# Default config dir: ~/.config/opencode

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_DIR="${1:-$HOME/.config/opencode}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=== PRIDES Installer ===${NC}"
echo "Config dir: $CONFIG_DIR"
echo ""

# Check config dir exists
if [ ! -d "$CONFIG_DIR" ]; then
  echo -e "${RED}Config directory not found: $CONFIG_DIR${NC}"
  echo "Create it first: mkdir -p $CONFIG_DIR"
  exit 1
fi

# Create target directories
mkdir -p "$CONFIG_DIR/agents/prides"
mkdir -p "$CONFIG_DIR/rules"
mkdir -p "$CONFIG_DIR/skills"
mkdir -p "$CONFIG_DIR/scripts"
mkdir -p "$CONFIG_DIR/plugins/swarm"

# Copy plugin
echo -n "Installing plugin... "
cp "$SCRIPT_DIR/index.js" "$CONFIG_DIR/plugins/swarm/index.js"
echo -e "${GREEN}done${NC}"

# Copy agents
echo -n "Installing agents (28 files)... "
cp -r "$SCRIPT_DIR/assets/agents/prides/"* "$CONFIG_DIR/agents/prides/"
echo -e "${GREEN}done${NC}"

# Copy rules (don't overwrite user's existing rules)
echo -n "Installing rules (7 files)... "
for f in "$SCRIPT_DIR/assets/rules/"*.md; do
  name=$(basename "$f")
  target="$CONFIG_DIR/rules/$name"
  if [ -f "$target" ]; then
    echo -e "\n  ${YELLOW}skip${NC}: $name (already exists)"
  else
    cp "$f" "$target"
  fi
done
echo -e "${GREEN}done${NC}"

# Copy skills
echo -n "Installing skills (2 dirs)... "
for skill_dir in "$SCRIPT_DIR/assets/skills/"*/; do
  skill_name=$(basename "$skill_dir")
  if [ -d "$CONFIG_DIR/skills/$skill_name" ]; then
    echo -e "\n  ${YELLOW}skip${NC}: $skill_name/ (already exists)"
  else
    cp -r "$skill_dir" "$CONFIG_DIR/skills/$skill_name"
  fi
done
echo -e "${GREEN}done${NC}"

# Copy scripts
echo -n "Installing scripts (4 files)... "
cp "$SCRIPT_DIR/assets/scripts/"*.sh "$CONFIG_DIR/scripts/"
chmod +x "$CONFIG_DIR/scripts/"*.sh
echo -e "${GREEN}done${NC}"

echo ""
echo -e "${GREEN}=== Installation Complete ===${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Add the plugin to your opencode.jsonc:"
echo ""
echo -e "   ${CYAN}\"plugins\": ["
echo "     \"file://$CONFIG_DIR/plugins/swarm/index.js\""
echo -e "   ]${NC}"
echo ""
echo "2. Restart OpenCode"
echo ""
echo "3. The PRIDES coordinator will be available as @prides/coordinator"
echo "   or configure it as your primary agent in opencode.jsonc"
echo ""
echo "Installed files:"
echo "  Plugin:  $CONFIG_DIR/plugins/swarm/index.js"
echo "  Agents:  $CONFIG_DIR/agents/prides/"
echo "  Rules:   $CONFIG_DIR/rules/"
echo "  Skills:  $CONFIG_DIR/skills/planning-with-files/"
echo "           $CONFIG_DIR/skills/spec-driven/"
echo "  Scripts: $CONFIG_DIR/scripts/"
