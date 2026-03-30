# UICanvas

<div align="center">

🎨 **UI preview canvas for developers — see AI-generated designs instantly, no Figma needed.**

开发者的 UI 预览画布 — 即时查看 AI 生成的设计效果，内置组件素材库，无需专业设计工具。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)](https://nodejs.org)

</div>

---

## Why UICanvas?

You're a developer, not a designer. But you still need to **see** what the AI is generating.

- 🤖 AI coding agents (Cursor, Copilot, Claude) generate UI code — but where do you preview it?
- 🎨 Figma is overkill when you just want a quick visual check
- 📦 You want ready-made components to kickstart your design, not a blank canvas

**UICanvas** gives you an infinite canvas right in your browser. Connect it to any AI agent via MCP, and watch your UI designs appear in real-time — with a built-in component library to get started fast.

## ✨ Features

| Feature | Description |
|---|---|
| 🖼️ **Infinite Canvas** | Zoom (10%–800%), pan, grid background, auto-layout artboards |
| 🤖 **MCP Integration** | AI agents create artboards, write HTML, read DOM, take screenshots |
| 📦 **Component Library** | iOS (Apple HIG) + Web (Shadcn/Vercel-style) pre-built components |
| 🎨 **Design Spec** | Auto-generated design system sheet (colors, typography, spacing) |
| ⚡ **Zero Config** | Pure HTML/CSS/JS, no framework, ~50KB — just `npm start` |
| 🔒 **Self-hosted** | Runs on your machine, no SaaS, no account needed |
| 🌙 **Dark Theme** | Professional dark UI with glassmorphism toolbar |

## 🚀 Quick Start

```bash
git clone https://github.com/markvely/uicanvas.git
cd uicanvas
npm install
node server.js
```

Open **http://localhost:3200** — you'll see the canvas with demo artboards and the component library.

### Connect to AI Agents

```bash
node server.js --stdio
```

Add to your MCP client config (Cursor, Claude Desktop, etc.):

```json
{
  "mcpServers": {
    "uicanvas": {
      "command": "node",
      "args": ["/path/to/uicanvas/server.js", "--stdio"]
    }
  }
}
```

Now your AI agent can design UI directly on the canvas! 🎉

### 🚨 Critical Rules for AI Agents

If you are an AI Coding Agent reading this documentation to understand how to use UICanvas, **you MUST explicitly obey the following boundaries**:
1. **Never write custom WebSocket scripts**: You are strictly forbidden from writing Node.js, Python, or shell scripts to connect to `localhost:3200`.
2. **Use MCP Tools Only**: You must interact with the canvas EXCLUSIVELY through the provided MCP tools (`init_project`, `create_artboard`, `write_html`, etc.).
3. **If Tools Are Missing (Prefix Issue)**: Depending on your host IDE or agent environment, the MCP tools might expose automatically with a prefix appended (such as `mcp_uicanvas_open_canvas`). **DO NOT** look for an exact name match like `open_canvas`. Instead, perform a substring match (`open_canvas`) on your available tools. If they are truly missing despite substrings, **STOP IMMEDIATELY**. Tell the user: *"I cannot find the UICanvas MCP tools. Please Reload your VSCode Window or start a new Agent chat session so the tools can mount."*
4. **NO Local HTML Files**: When asked to design or write UI, you **MUST** use `create_artboard` and `write_html`. You are strictly forbidden from writing `.html` files to the user's local disk or just spitting out code blocks in the chat. Render it in the canvas!

**Pre-flight Context Check & Professional Designer Mindset**:
Before you output any design code, you MUST:
- **Scan the environment**: Briefly read `package.json`, `README.md`, or the main app files to determine the project type, human language (e.g., English, Chinese), tech stack, and expected visual style. 
- **Embody the Designer**: 
  - *Graphic Designer*: Who is the audience? Establish proper visual hierarchy and emotional resonance.
  - *Interaction Designer*: What is the user goal? Minimize clicks and handle all feedback loops (loading, errors).
  - *UI Designer*: Is the interface self-explanatory? Build a consistent, reusable design system rather than isolated painted pages.
- **Strict Spec Adherence**: You must strictly use the design tokens (colors, typography, spacing) defined in the initial Design Spec. **🚨 CRITICAL**: If you encounter a design iteration bottleneck or need new styles, you **MUST** stop designing the current page, return to update the Design Spec artboard first, and only then resume designing the page.

## 🏗️ How It Works

```
AI Agent ──MCP stdio──▶ Node.js Server ──WebSocket──▶ Browser Canvas
                              ▲                            │
                              └────── DOM query ◀──────────┘
```

The AI agent sends design commands via MCP → the server forwards them via WebSocket → the browser renders HTML on the infinite canvas → you see the result instantly.

## 📦 Built-in Component Library

No need to design from scratch. UICanvas ships with professional components:

### iOS Components (Apple HIG)

| Module | What's Inside |
|---|---|
| Navigation | NavBar (large/inline), TabBar, ToolBar |
| Controls | Button (5 styles × 3 sizes × 5 colors), Toggle, Slider, Stepper, Segmented |
| Content | List (grouped, icons, toggles), Card, Section Group |
| Inputs | TextField (default/focused/error), SearchBar |
| Feedback | Alert, ActionSheet, Toast (success/error/info) |

### Web Components (Shadcn / Vercel Geist style)

| Module | What's Inside |
|---|---|
| Layout | Header, Footer (multi-column), Sidebar |
| Data | Stat Card (sparkline + trend), Data Table (pagination) |
| Forms | Input, Select, Checkbox, Radio, Tabs (underline/pill) |

## 🛠️ MCP Tools

| Tool | What It Does |
|---|---|
| `create_artboard` | Create a new design artboard |
| `write_html` | Inject HTML into an artboard |
| `get_screenshot` | Capture artboard as image |
| `get_basic_info` | Get canvas summary |
| `get_children` | List child nodes |
| `get_tree` | Get subtree hierarchy |
| `get_node_info` | Inspect node properties |
| `get_styles` | Read computed CSS |
| `update_styles` | Modify styles |
| `set_text` | Update text content |
| `delete_nodes` | Remove nodes |
| `duplicate_nodes` | Clone nodes |

## 📁 Project Structure

```
uicanvas/
├── server.js                 # Express + WS + MCP entry
├── lib/
│   ├── mcp-tools.js          # MCP tool definitions
│   ├── ws-bridge.js          # WebSocket bridge
│   └── artboard-manager.js   # Artboard state management
├── public/
│   ├── index.html            # Canvas UI + demo
│   ├── css/                  # Dark theme + design tokens
│   └── js/                   # Canvas engine + artboard renderer
└── components/
    ├── index.js              # Gallery renderer
    ├── ios/                  # iOS components (5 modules)
    └── web/                  # Web components (3 modules)
```

## 🤝 Contributing

Contributions welcome! Fork → Branch → PR.

## 📄 License

[MIT](LICENSE)

---

## 中文说明

**UICanvas** 是一个面向开发者的 UI 预览画布。在 Web 开发过程中，让 AI 代理（如 Cursor、Copilot、Claude）直接在画布上生成和预览 UI 设计。

### 为什么选择 UICanvas？

- 🚫 **不需要 Figma** — 开发者只需要一个快速预览 UI 的地方
- 🤖 **MCP 集成** — AI 代理通过标准协议直接在画布上"画"设计
- 📦 **内置素材库** — iOS + Web 组件开箱即用，快速启动设计
- ⚡ **零配置** — `npm install && node server.js`，浏览器打开即用
- 🔒 **完全本地** — 无需云服务，无需注册账号

### 相关项目对比

| 项目 | 对比 |
|---|---|
| [Paper.design](https://paper.design) | 闭源商业产品 |
| [Pencil.dev](https://pencil.dev) | 闭源 IDE 插件 |
| [Penpot](https://penpot.app) | 开源但无 MCP |
| **UICanvas** | ✅ 开源 + MCP + 素材库 |
