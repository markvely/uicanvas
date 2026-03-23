# 🤖 把 UI Canvas 变成你的 AI 技能 (Skills)

因为 UI Canvas 底层是一个标准的 **MCP (Model Context Protocol)** 服务器，所以它可以无缝接入目前市面上主流的 AI Agent 平台！

我们将它封装成了三种主流 Agent 的技能说明/配置，让你直接拥有“能画界面的 AI 同事”。

## 技能文档列表

👉 **[Antigravity 技能/工作流](./../.agents/workflows/ui-designer.md)** 
(*如果你正在呼叫 Antigravity，只需 `@` 提及此工作流，它就会自动理解完整的 UI 设计规范体系。* `/.agents` 下存放了让模型自身理解的最佳实践指示。)

👉 **[给 Claude Code 的使用配置](./claude-code.md)**  
*(如何在原生 Claude Code 命令行挂载此 MCP 和对应的 Prompt 指南)*

👉 **[给 OpenClaw 的使用配置](./openclaw.md)**  
*(如何在 openclaw.yaml 中配置以启用此设计体系)*

---

### 💡 核心设计理念：Design Spec First

所有这些技能的核心不仅是教 AI “怎么接通工具”，更重要的是传授**“怎么进行好设计”**的方法论：
我们强制/建议所有的 AI 助手在画具体界面前，**必须先画出一套【设计规范 (Design Spec)】画板**，将颜色、字号、间距固化下来。这样不仅代码更加一致，产出的页面也无限接近真人专业设计师的水准。
