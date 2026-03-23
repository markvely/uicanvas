# UICanvas for OpenClaw

OpenClaw 支持所有标准的 MCP (Model Context Protocol) 服务器。要让 OpenClaw 成为你的全自动 UI 设计师，你只需要在配置文件中添加 `design-canvas-mcp`。

## 配置方法

1. 打开你的 OpenClaw 配置文件（通常位于 `~/.config/openclaw/openclaw.yaml` 或项目内的 `.openclaw.yaml`）。
2. 在 `mcp_servers` 节点下添加以下配置：

```yaml
mcp_servers:
  uicanvas:
    command: node
    args:
      - /绝对路径/到/design-canvas-mcp/server.js
```

*(请将 `/绝对路径/到/` 替换为你实际克隆本工具的结对路径。)*

## 重启与使用

保存配置文件后，重启 OpenClaw。系统加载后会自动获取 `create_artboard`, `write_html`, `get_screenshot` 等所有与 UI 设计相关的能力。

### 推荐交互 Prompt

为了触发最佳的“设计规范优先”工作流，建议告诉 OpenClaw：

> “你现在已经连接了 UI Canvas MCP。请在进行具体的 UI 页面设计之前，强制自己先画一套名为‘UI Canvas Design Spec’的系统画板，用 write_html 输出颜色板、排版、阴影等。得到确认后再进行实际的页面功能开发。”

OpenClaw 也可以结合内置的内存工具记忆你的设计偏好。
