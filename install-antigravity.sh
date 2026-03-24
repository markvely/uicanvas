#!/bin/bash
# Install UICanvas Skill and Workflows globally for Antigravity

set -e

# Get absolute path of the directory containing this script
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "🎨 Installing UICanvas for Antigravity..."

# Create necessary global directories
mkdir -p ~/.agents/skills
mkdir -p ~/.agents/workflows
mkdir -p ~/.agent/workflows
mkdir -p ~/.gemini/antigravity/skills
mkdir -p ~/.gemini/antigravity/workflows

# Link the Skill
echo "Linking skill..."
ln -sf "$REPO_DIR" ~/.agents/skills/uicanvas
ln -sf "$REPO_DIR" ~/.gemini/antigravity/skills/uicanvas

# Link the Workflow
echo "Linking workflow..."
ln -sf "$REPO_DIR/.agents/workflows/ui-designer.md" ~/.agents/workflows/ui-designer.md
ln -sf "$REPO_DIR/.agents/workflows/ui-designer.md" ~/.agent/workflows/ui-designer.md
ln -sf "$REPO_DIR/.agents/workflows/ui-designer.md" ~/.gemini/antigravity/workflows/ui-designer.md

echo "✅ Installation complete!"
echo ""
echo "IMPORTANT: To finish setup:"
echo "1. Add the following to your ~/.gemini/antigravity/mcp_config.json:"
echo "---------------------------------------------------------"
echo "    \"uicanvas\": {"
echo "      \"command\": \"node\","
echo "      \"args\": [\"$REPO_DIR/server.js\", \"--stdio\"]"
echo "    }"
echo "---------------------------------------------------------"
echo "2. Restart Antigravity completely (Quit and reopen)."
echo "3. Type '/UI Designer' in any project to start designing!"
