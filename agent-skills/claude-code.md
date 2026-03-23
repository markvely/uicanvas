# UICanvas for Claude Code

Claude Code 拥有强大的终端操作和代码生成能力，结合 UICanvas，它可以直接在本地为你绘制和预览高保真 UI 设计图。

## 安装方法

在终端（即你的代码项目根目录）中运行以下命令，将 UICanvas 作为 MCP (Model Context Protocol) 工具添加到 Claude Code 中：

```bash
claude mcp add uicanvas node /绝对路径/到/design-canvas-mcp/server.js
```

*(请将 `/绝对路径/到/` 替换为你实际克隆本工具的结对路径。)*

## 使用方法

安装完成后，当你打开 `claude` 命令行，你可以直接对其下发设计指令：

### 最佳实践 Prompt

为了让 Claude 生成最好的设计，建议在提出需求时复制以下 Prompt 作为前置指令：

```text
你现在已经连接了 UICanvas MCP 服务器，可以进行 UI 设计了。请遵守 "Design Spec First" 工作流：
1. 分析我的需求，首先生成一套【项目名 - 设计规范】画板，把主色、字体、间距等规范用 write_html 渲染出来。
2. 规范确立后，再按照【项目名 - 页面名 - 状态】的命名格式创建具体的页面画板。
3. 具体页面的 CSS 必须严格遵守刚刚定义的设计规范。
4. 每画完一个复杂区块，请 call get_screenshot 自己检查一下布局。

我的需求是：设计一个“个人任务管理工具”的 Dashboard 页面。
```

## 运作机制

- Claude 会自动抓取本地系统的字体。
- 它可以调用 `write_html` 来生成设计。
- 只有在你浏览 http://localhost:3200 页面时，你才能看到它的实时创作过程。
