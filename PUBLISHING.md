# UICanvas 插件发布指南

每次迭代发版时，按以下步骤操作。

## 1. 更新版本号

修改 `package.json` 中的 `version` 字段（遵循 semver 语义化版本）：
```json
"version": "1.2.0"
```

## 2. 打包 VSIX

```bash
cd /Users/mark/Documents/项目/design-canvas-mcp
npx @vscode/vsce package
```

打包完成后会在当前目录生成 `uicanvas-x.x.x.vsix`。

## 3. 发布到 Visual Studio Marketplace（微软商店）

> 适用于：VSCode、Cursor 等微软生态 IDE

```bash
# 首次需要登录（粘贴 Personal Access Token）
npx vsce login BabyfeiCCD

# 发布
npx vsce publish
```

**Token 管理**：https://dev.azure.com/BabyfeiCCD/_usersSettings/tokens
- Organization: `All accessible organizations`
- Scopes: `Marketplace → Publish`

**商店后台**：https://marketplace.visualstudio.com/manage/publishers/BabyfeiCCD

## 4. 发布到 Open VSX（Antigravity / 开源商店）

> 适用于：Antigravity、VSCodium 等开源 IDE

```bash
npx ovsx publish uicanvas-x.x.x.vsix -p <YOUR_OPENVSX_TOKEN>
```

**Token 管理**：https://open-vsx.org/user-settings/tokens

**商店页面**：https://open-vsx.org/extension/BabyfeiCCD/uicanvas

## 5. 推送代码到 GitHub

```bash
git add -A
git commit -m "release: vX.X.X"
git push origin main
```

---

## 快速发版（一键复制）

```bash
# 替换 X.X.X 为实际版本号
cd /Users/mark/Documents/项目/design-canvas-mcp
npx @vscode/vsce package
npx vsce publish
npx ovsx publish uicanvas-X.X.X.vsix -p <YOUR_OPENVSX_TOKEN>
git add -A && git commit -m "release: vX.X.X" && git push origin main
```
