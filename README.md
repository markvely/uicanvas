# DesignCanvas MCP

<div align="center">

🎨 **Open-source design canvas with MCP integration — let AI agents create, inspect, and manipulate UI designs on an infinite canvas.**

[English](#features) · [中文说明](#中文说明)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)](https://nodejs.org)

</div>

---

## ✨ Features

- **Infinite Canvas** — Zoom (10%–800%), pan, grid background, artboard auto-layout
- **MCP Server** — AI agents can create artboards, write HTML, read DOM, take screenshots
- **Component Library** — iOS (Apple HIG) + Web (Shadcn/Vercel-inspired) pre-built components
- **Design Spec** — Auto-generated design system spec sheet (colors, typography, spacing, shadows)
- **Lightweight** — Pure HTML/CSS/JS, no framework dependencies, ~50KB total
- **Self-hosted** — Runs entirely on your machine, no SaaS required
- **Dark Theme** — Professional dark UI with glassmorphism toolbar

## 🏗️ Architecture

```
AI Agent ──MCP stdio──▶ Node.js Server ──WebSocket──▶ Browser Canvas
                              ▲                            │
                              └────── DOM query ◀──────────┘
```

| Layer | Tech |
|---|---|
| MCP Server | `@modelcontextprotocol/sdk` + stdio transport |
| Web Server | Express + WebSocket (`ws`) |
| Canvas UI | Vanilla JS infinite canvas (zoom/pan/grid) |
| Rendering | `ArtboardRenderer` — HTML string → DOM nodes |

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/Markvely/design-canvas-mcp.git
cd design-canvas-mcp

# Install
npm install

# Run
node server.js
```

Open **http://localhost:3200** — you'll see the canvas with demo artboards.

### MCP Mode (for AI agents)

```bash
node server.js --stdio
```

Add to your MCP client config:

```json
{
  "mcpServers": {
    "design-canvas": {
      "command": "node",
      "args": ["/path/to/design-canvas-mcp/server.js", "--stdio"]
    }
  }
}
```

## 🛠️ MCP Tools

| Tool | Description |
|---|---|
| `create_artboard` | Create a new artboard with size, position, styles |
| `write_html` | Inject HTML into an artboard (insert-children / replace) |
| `get_basic_info` | Get canvas summary: artboard count, dimensions |
| `get_children` | List child nodes of any element |
| `get_tree` | Get subtree hierarchy summary |
| `get_node_info` | Inspect a specific node's properties |
| `get_styles` | Read computed CSS styles |
| `update_styles` | Modify styles on nodes |
| `set_text` | Update text content |
| `delete_nodes` | Remove nodes from the design |
| `duplicate_nodes` | Clone nodes |
| `get_screenshot` | Capture artboard as base64 image |

## 📦 Component Library

### iOS Components (Apple HIG)

| Module | Components |
|---|---|
| `navigation.js` | NavBar (large/inline), TabBar (5-tab with SVG icons), ToolBar |
| `controls.js` | Button (5 styles × 3 sizes), Toggle, Slider, Stepper, Segmented Control |
| `content.js` | List (inset grouped, icons, toggles), Card, Section Group |
| `inputs.js` | TextField (states: default/focused/error), SearchBar |
| `feedback.js` | Alert, ActionSheet, Toast (success/error/info) |

### Web Components (Shadcn / Vercel Geist inspired)

| Module | Components |
|---|---|
| `layout.js` | Header, Footer (multi-column + social), Sidebar |
| `data.js` | Stat Card (sparkline + trend), Data Table (pagination) |
| `forms.js` | Input, Select, Checkbox, Radio Group, Tabs (underline/pill) |

## 🎨 Design Tokens

```css
/* Colors */
--dc-accent: #5E5CE6;
--dc-bg-primary: #000000;
--dc-bg-canvas: #1A1A1A;

/* Typography (system-ui / SF Pro) */
--dc-font-large-title: 700 34px/41px system-ui;
--dc-font-body: 400 17px/22px system-ui;

/* Spacing: 4/8/12/16/24/48px */
/* Radius: 6/8/12/16/9999px */
```

## 📁 Project Structure

```
design-canvas-mcp/
├── server.js                 # Express + WS + MCP entry
├── lib/
│   ├── mcp-tools.js          # MCP tool definitions
│   ├── ws-bridge.js          # WebSocket bridge
│   └── artboard-manager.js   # Artboard state management
├── public/
│   ├── index.html            # Main page + demo renderer
│   ├── css/
│   │   ├── style.css         # Canvas styles (dark theme, grid)
│   │   └── tokens.css        # Design tokens
│   └── js/
│       ├── canvas.js         # Infinite canvas (zoom/pan)
│       ├── artboard.js       # Artboard rendering engine
│       ├── ws-client.js      # WebSocket client
│       └── components.js     # Component registry
└── components/
    ├── index.js              # Gallery renderer
    ├── ios/                   # iOS components (5 modules)
    └── web/                   # Web components (3 modules)
```

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/awesome`)
3. Commit your changes (`git commit -m 'Add awesome feature'`)
4. Push (`git push origin feature/awesome`)
5. Open a Pull Request

## 📄 License

[MIT](LICENSE) © Markvely

---

## 中文说明

**DesignCanvas MCP** 是一个开源的设计画布工具，通过 MCP (Model Context Protocol) 让 AI 代理能够在无限画布上创建、检查和操作 UI 设计。

### 核心特性

- 🖼️ **无限画布** — 缩放 (10%–800%)、平移、网格背景
- 🤖 **MCP 集成** — AI 代理可以创建画板、写入 HTML、读取 DOM、截图
- 📱 **组件库** — iOS (Apple HIG 风格) + Web (Shadcn/Vercel 风格) 预置组件
- 🎨 **设计规范** — 自动生成配色、字体、间距、阴影等设计规范文档
- ⚡ **轻量级** — 纯 HTML/CSS/JS，无框架依赖
- 🔒 **自托管** — 完全本地运行，无需云服务

### 快速开始

```bash
git clone https://github.com/Markvely/design-canvas-mcp.git
cd design-canvas-mcp
npm install
node server.js
# 打开 http://localhost:3200
```

### 相关项目

| 项目 | 对比 |
|---|---|
| [Paper.design](https://paper.design) | 闭源商业产品 |
| [Pencil.dev](https://pencil.dev) | 闭源 IDE 插件 |
| [Penpot](https://penpot.app) | 开源但无 MCP 支持 |
| **DesignCanvas MCP** | ✅ 完全开源 + MCP + 组件库 |
