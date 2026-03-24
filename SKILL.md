---
name: UICanvas
description: Real-time UI design canvas MCP server for AI Agents. See AI-generated designs instantly with built-in component library and Design Spec First workflow. No Figma needed.
version: 1.1.0
author: markvely
repository: https://github.com/markvely/uicanvas
tags:
  - ui
  - design
  - mcp
  - canvas
  - ai-agent
  - prototyping
---

# UICanvas

A real-time UI design canvas that runs as an **MCP (Model Context Protocol)** server. Connect it to any AI coding agent — Antigravity, Claude Code, OpenClaw, or any MCP-compatible tool — and watch it generate pixel-perfect UI designs on a live canvas.

## ✨ Key Features

- **Live Canvas Preview** — See AI-generated designs render in real-time at `http://localhost:3200`
- **Design Spec First Workflow** — Enforces a professional design process: define color palette, typography, and spacing *before* drawing pages
- **Structured Artboard Naming** — `[Project] — [Page] — [State]` format for organized design management
- **PNG Export** — Export any artboard as a 2x high-resolution PNG
- **Undo/Redo** — Roll back AI actions with full history support
- **Resizable Artboards** — Drag handles to adjust artboard height to fit content
- **Built-in Component Gallery** — Pre-built iOS navigation, tab bars, toolbars, and form elements

## 🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/markvely/uicanvas.git
cd uicanvas && npm install

# Start the MCP server
node server.js
```

Then open `http://localhost:3200` in your browser.

## 🔌 Connect to Your AI Agent

### Antigravity
Already built-in — just use the `/UI Designer` workflow.

### Claude Code
```bash
claude mcp add uicanvas node /path/to/uicanvas/server.js
```

### OpenClaw
Add to your `openclaw.yaml`:
```yaml
mcp_servers:
  uicanvas:
    command: node
    args:
      - /path/to/uicanvas/server.js
```

## 🎨 Design Spec First Workflow

This skill teaches AI agents to follow a professional design process:

1. **Create Design Spec** — Define colors, typography, spacing, and border radius
2. **Design Pages** — Build UI pages using the established spec tokens
3. **Verify with Screenshots** — Check layout every 2-3 modifications

This ensures consistent, high-quality output that looks like it came from a professional designer, not a random AI generation.

## 📦 MCP Tools Provided

| Tool | Description |
|------|-------------|
| `open_uicanvas_browser` | Open the UICanvas frontend in the user's default browser |
| `create_artboard` | Create a new artboard with structured naming |
| `write_html` | Render HTML/CSS into an artboard |
| `get_screenshot` | Capture a screenshot for AI self-verification |
| `delete_nodes` | Remove artboards or child nodes |
| `get_tree_summary` | Inspect the design hierarchy |

## License

MIT
