// extension.cjs
const vscode = require('vscode');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');

let serverProcess = null;
let panel = null;
let activePort = 0;
let isDirty = false;
let currentFilePath = null;

const PORT_FILE = path.join(os.tmpdir(), 'uicanvas.port');
const UICANVAS_DIR = 'UICanvas';

// ═════════════════════════════════════════════════════════════
// Utilities
// ═════════════════════════════════════════════════════════════

function cleanupStaleProcesses(currentPid) {
    try {
        // 杀掉所有旧的 uicanvas server.js 进程（HTTP Server + stdio），
        // 排除当前进程自身和当前 extension host 进程
        const myPid = currentPid || process.pid;
        // 匹配所有 node ... server.js 的 uicanvas 进程
        const cmd = `ps aux | grep '[n]ode.*uicanvas.*server\\.js' | grep -v grep | grep -v '${myPid}' | awk '{print $2}' | xargs kill -9 2>/dev/null || true`;
        execSync(cmd, { stdio: 'ignore' });
    } catch { /* ignore */ }
}

function findFreePort() {
    return new Promise((resolve) => {
        const srv = net.createServer();
        srv.listen(0, () => {
            const port = srv.address().port;
            srv.close(() => resolve(port));
        });
    });
}

function writePortFile(port) {
    try { fs.writeFileSync(PORT_FILE, String(port)); } catch {}
}

/** 确保 UICanvas 目录存在于工作区 */
function ensureUICanvasDir() {
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (!ws) return null;
    const dirPath = path.join(ws.uri.fsPath, UICANVAS_DIR);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    return dirPath;
}

/** 获取 UICanvas 目录中的所有 .uicanvas 文件 */
function getUICanvasFiles() {
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (!ws) return [];
    const dirPath = path.join(ws.uri.fsPath, UICANVAS_DIR);
    if (!fs.existsSync(dirPath)) return [];
    return fs.readdirSync(dirPath)
        .filter(f => f.endsWith('.uicanvas'))
        .map(f => ({
            name: f.replace('.uicanvas', ''),
            path: path.join(dirPath, f),
        }));
}


// ═════════════════════════════════════════════════════════════
// Sidebar Tree Data Provider
// ═════════════════════════════════════════════════════════════

class UICanvasTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    getChildren() {
        const files = getUICanvasFiles();
        if (files.length === 0) {
            const item = new vscode.TreeItem('No design files yet');
            item.description = 'Use AI to create a design';
            return [item];
        }
        return files.map(f => {
            const item = new vscode.TreeItem(f.name, vscode.TreeItemCollapsibleState.None);
            item.iconPath = new vscode.ThemeIcon('file-media');
            item.description = '.uicanvas';
            item.command = {
                command: 'uicanvas.openFile',
                title: 'Open Design',
                arguments: [f.path],
            };
            item.contextValue = 'uicanvasFile';
            const stat = fs.statSync(f.path);
            item.tooltip = `Last modified: ${stat.mtime.toLocaleString()}`;
            return item;
        });
    }
}


// ═════════════════════════════════════════════════════════════
// Custom Editor Provider
// ═════════════════════════════════════════════════════════════

class UICanvasEditorProvider {
    constructor(context) {
        this.context = context;
    }

    async resolveCustomTextEditor(document, webviewPanel) {
        webviewPanel.webview.options = { enableScripts: true };
        webviewPanel.webview.html = getWebviewHTML(activePort);

        // 等面板加载后，发送文件内容
        setTimeout(() => {
            loadFileIntoPanel(document.uri.fsPath);
        }, 2000);
    }
}

UICanvasEditorProvider.viewType = 'uicanvas.editor';


// ═════════════════════════════════════════════════════════════
// Extension Lifecycle
// ═════════════════════════════════════════════════════════════

async function activate(context) {
    console.log('UICanvas extension activated.');
    cleanupStaleProcesses(process.pid);

    // ── 1. 启动 HTTP 服务器 ──────────────────────────
    if (!serverProcess) {
        activePort = await findFreePort();
        const serverPath = path.join(context.extensionPath, 'server.js');
        serverProcess = spawn('node', [serverPath, '--port', String(activePort)], {
            cwd: context.extensionPath,
            env: process.env,
            stdio: 'pipe',
        });

        let outBuf = '';
        serverProcess.stdout.on('data', (data) => {
            outBuf += data.toString();
            const lines = outBuf.split('\n');
            outBuf = lines.pop();
            for (const line of lines) {
                console.log(`[UICanvas] ${line}`);
                if (line.includes('__UICANVAS_OPEN_PANEL__')) {
                    openPanel(context, true);
                }
                // 处理来自前端的保存请求
                if (line.startsWith('__UICANVAS_SAVE__')) {
                    const jsonStr = line.replace('__UICANVAS_SAVE__', '');
                    handleSaveFromFrontend(jsonStr);
                }
                // 处理 dirty 状态变化
                if (line === '__UICANVAS_DIRTY__') {
                    setDirty(true);
                }
            }
        });
        serverProcess.stderr.on('data', (data) => console.error(`[UICanvas Error] ${data}`));
        serverProcess.on('close', (code) => {
            console.log(`[UICanvas] HTTP server exited with code ${code}`);
            serverProcess = null;
        });

        console.log(`[UICanvas] HTTP server starting on port ${activePort}`);
    }

    // ── 2. 端口文件 ──────────────────────────────────
    writePortFile(activePort);
    context.subscriptions.push(
        vscode.window.onDidChangeWindowState((state) => {
            if (state.focused && activePort) writePortFile(activePort);
        })
    );

    // ── 3. MCP 配置注入 ─────────────────────────────
    try {
        const configPath = path.join(os.homedir(), '.gemini', 'antigravity', 'mcp_config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const serverJsPath = path.join(context.extensionPath, 'server.js');
            if (!config.mcpServers) config.mcpServers = {};
            config.mcpServers["uicanvas"] = {
                "command": "node",
                "args": [serverJsPath, "--stdio"]
            };
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        }
    } catch (err) {
        console.error('Failed to configure Antigravity MCP:', err);
    }

    // ── 4. Sidebar Tree View ────────────────────────
    const treeProvider = new UICanvasTreeProvider();
    vscode.window.registerTreeDataProvider('uicanvas.files', treeProvider);

    // 监听 UICanvas 目录变化
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (ws) {
        const dirPath = path.join(ws.uri.fsPath, UICANVAS_DIR);
        if (fs.existsSync(dirPath)) {
            const watcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(dirPath, '*.uicanvas')
            );
            watcher.onDidCreate(() => treeProvider.refresh());
            watcher.onDidDelete(() => treeProvider.refresh());
            watcher.onDidChange(() => treeProvider.refresh());
            context.subscriptions.push(watcher);
        }
    }

    // ── 5. Custom Editor Provider ───────────────────
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            UICanvasEditorProvider.viewType,
            new UICanvasEditorProvider(context),
            { webviewOptions: { retainContextWhenHidden: true } }
        )
    );

    // ── 6. Commands ─────────────────────────────────
    context.subscriptions.push(
        vscode.commands.registerCommand('uicanvas.start', () => openPanel(context)),
        vscode.commands.registerCommand('uicanvas.newFile', async () => {
            const name = await vscode.window.showInputBox({
                prompt: 'Design file name',
                placeHolder: 'e.g. Timer App',
                validateInput: (v) => v.trim() ? null : 'Name is required',
            });
            if (!name) return;
            const dir = ensureUICanvasDir();
            if (!dir) {
                vscode.window.showErrorMessage('No workspace folder open.');
                return;
            }
            const filePath = path.join(dir, `${name}.uicanvas`);
            const emptyDoc = {
                version: 1,
                projectName: name,
                designTokens: {},
                artboards: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            fs.writeFileSync(filePath, JSON.stringify(emptyDoc, null, 2));
            treeProvider.refresh();
            // 打开该文件
            vscode.commands.executeCommand('uicanvas.openFile', filePath);
        }),
        vscode.commands.registerCommand('uicanvas.refresh', () => treeProvider.refresh()),
        vscode.commands.registerCommand('uicanvas.openFile', (filePath) => {
            currentFilePath = filePath;
            openPanel(context, false);
            // 延迟加载文件内容到面板
            setTimeout(() => loadFileIntoPanel(filePath), 1500);
        }),
        vscode.commands.registerCommand('uicanvas.save', () => {
            requestSaveFromFrontend();
        }),
    );
}


// ═════════════════════════════════════════════════════════════
// Save / Load
// ═════════════════════════════════════════════════════════════

/** 请求前端序列化当前画布状态 */
function requestSaveFromFrontend() {
    if (!serverProcess) return;
    // 通过 HTTP server 的 stdin 发送保存请求
    // 实际上我们通过 stdout 信号（前端→HTTP server stdout→extension）
    // 这里用不同的方式：直接向 HTTP server 发 HTTP 请求
    const http = require('http');
    const req = http.request({
        hostname: 'localhost',
        port: activePort,
        path: '/__save__',
        method: 'POST',
    });
    req.end();
}

/** 处理来自前端的保存数据 */
function handleSaveFromFrontend(jsonStr) {
    try {
        const data = JSON.parse(jsonStr);
        if (!currentFilePath) {
            // 没有文件路径，询问保存位置
            const dir = ensureUICanvasDir();
            if (!dir) return;
            const name = data.projectName || 'Untitled';
            currentFilePath = path.join(dir, `${name}.uicanvas`);
        }
        data.updatedAt = new Date().toISOString();
        if (!data.createdAt) data.createdAt = data.updatedAt;
        fs.writeFileSync(currentFilePath, JSON.stringify(data, null, 2));
        setDirty(false);
        console.log(`[UICanvas] Saved to ${currentFilePath}`);
    } catch (err) {
        console.error('[UICanvas] Save failed:', err);
    }
}

/** 加载文件内容到面板的画布中 */
function loadFileIntoPanel(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return;
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        // 通过 HTTP 请求发送加载命令
        const http = require('http');
        const postData = JSON.stringify(data);
        const req = http.request({
            hostname: 'localhost',
            port: activePort,
            path: '/__load__',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
        });
        req.write(postData);
        req.end();
        currentFilePath = filePath;
    } catch (err) {
        console.error('[UICanvas] Load failed:', err);
    }
}


// ═════════════════════════════════════════════════════════════
// Dirty State
// ═════════════════════════════════════════════════════════════

function setDirty(dirty) {
    isDirty = dirty;
    if (panel) {
        const base = '🎨 UICanvas';
        panel.title = dirty ? `${base} ●` : base;
    }
}


// ═════════════════════════════════════════════════════════════
// Webview Panel
// ═════════════════════════════════════════════════════════════

function getWebviewHTML(port) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>UICanvas</title>
        <style>
            body, html { margin: 0; padding: 0; height: 100%; border: none; overflow: hidden; background: #1e1e1e; }
            iframe { width: 100%; height: 100%; border: none; }
            .loading { position: fixed; inset: 0; font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #888; font-size: 14px; background: #1e1e1e; gap: 12px; }
            .spinner { width: 24px; height: 24px; border: 2px solid #333; border-top-color: #6366f1; border-radius: 50%; animation: spin 1s linear infinite; }
            @keyframes spin { to { transform: rotate(360deg); } }
        </style>
    </head>
    <body>
        <div id="loader" class="loading">
            <div class="spinner"></div>
            <span>Connecting to UICanvas...</span>
        </div>
        <iframe id="canvas-frame" src="about:blank" onload="document.getElementById('loader').style.display='none'"></iframe>
        <script>
            let iframe = document.getElementById('canvas-frame');
            function tryLoad() { iframe.src = 'http://localhost:${port}'; }
            setTimeout(tryLoad, 500);
        </script>
    </body>
    </html>`;
}

function openPanel(context, preserveFocus = false) {
    if (panel) {
        try {
            // 面板已存在时，仅 reveal，不重新加载 HTML（避免画布状态丢失）
            panel.reveal(vscode.ViewColumn.Two, preserveFocus);
            return;
        } catch { panel = null; }
    }

    panel = vscode.window.createWebviewPanel(
        'uiCanvas', '🎨 UICanvas',
        { viewColumn: vscode.ViewColumn.Two, preserveFocus },
        { enableScripts: true, retainContextWhenHidden: true }
    );

    panel.onDidDispose(() => {
        if (isDirty) {
            // 面板已关闭，需在下次打开时自动保存
            requestSaveFromFrontend();
        }
        panel = null;
    });

    panel.webview.html = getWebviewHTML(activePort);
}


// ═════════════════════════════════════════════════════════════
// Deactivation
// ═════════════════════════════════════════════════════════════

function deactivate() {
    // 强制杀死 HTTP Server 进程（SIGKILL，确保不残留）
    if (serverProcess) {
        try { serverProcess.kill('SIGKILL'); } catch { /* ignore */ }
        serverProcess = null;
    }
    if (panel) { panel.dispose(); panel = null; }
    // 清理端口文件，避免下次启动时读到脏数据
    try { fs.unlinkSync(PORT_FILE); } catch { /* ignore */ }
}

module.exports = { activate, deactivate };
