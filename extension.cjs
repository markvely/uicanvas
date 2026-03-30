// extension.cjs
const vscode = require('vscode');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');
const http = require('http');

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

function cleanupStaleProcesses() {
    try {
        // 仅杀掉旧的 HTTP Server 进程（带 --port 参数），
        // 不杀 stdio 进程（由 MCP 客户端管理，杀掉会导致 EOF 错误）
        const cmd = `ps aux | grep '[n]ode.*uicanvas.*server\\\\.js.*--port' | grep -v -- '--stdio' | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true`;
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

/** 轮询等待 HTTP 服务器就绪 */
function waitForServerReady(maxMs = 15000) {
    return new Promise((resolve) => {
        const start = Date.now();
        const poll = () => {
            if (Date.now() - start > maxMs) { resolve(false); return; }
            const req = http.request({
                hostname: 'localhost', port: activePort,
                path: '/__status__', method: 'GET', timeout: 2000,
            }, (res) => {
                let body = '';
                res.on('data', (d) => { body += d; });
                res.on('end', () => {
                    try {
                        const data = JSON.parse(body);
                        if (data.ready && data.wsClients > 0) { resolve(true); return; }
                    } catch { /* ignore */ }
                    setTimeout(poll, 300);
                });
            });
            req.on('error', () => setTimeout(poll, 300));
            req.end();
        };
        poll();
    });
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
        // 等待 HTTP 服务器和 WS 客户端都就绪后再发送文件内容
        const ready = await waitForServerReady();
        if (ready) {
            loadFileIntoPanel(document.uri.fsPath);
        } else {
            console.warn('[UICanvas] Server not ready, file may not load correctly');
            // 降级：延迟后尝试
            setTimeout(() => loadFileIntoPanel(document.uri.fsPath), 3000);
        }
    }
}

UICanvasEditorProvider.viewType = 'uicanvas.editor';


// ═════════════════════════════════════════════════════════════
// Extension Lifecycle
// ═════════════════════════════════════════════════════════════

async function activate(context) {
    console.log('UICanvas extension activated.');
    cleanupStaleProcesses();

    // ── 0. MCP 配置注入（最先执行，纯同步，不依赖端口）─────────
    // Antigravity daemon 可能在插件激活前就已经读取配置，因此必须在任何 async 操作之前完成
    try {
        const serverJsPath = path.join(context.extensionPath, 'server.js');
        let nodeCmd = 'node';
        try {
            nodeCmd = execSync('which node', { encoding: 'utf8' }).trim();
        } catch (err) {
            nodeCmd = process.execPath;
        }
        const mcpEntry = {
            "command": nodeCmd,
            "args": [serverJsPath, "--stdio"]
        };

        // 主配置：~/.gemini/settings.json
        const geminiDir = path.join(os.homedir(), '.gemini');
        if (!fs.existsSync(geminiDir)) {
            fs.mkdirSync(geminiDir, { recursive: true });
        }
        const primaryPath = path.join(geminiDir, 'settings.json');
        let primaryConfig = { mcpServers: {} };
        if (fs.existsSync(primaryPath)) {
            try { primaryConfig = JSON.parse(fs.readFileSync(primaryPath, 'utf8')); } catch { /* ignore parse errors */ }
        }
        if (!primaryConfig.mcpServers) primaryConfig.mcpServers = {};
        primaryConfig.mcpServers["uicanvas"] = mcpEntry;
        fs.writeFileSync(primaryPath, JSON.stringify(primaryConfig, null, 2));

        // 兼容旧路径：~/.gemini/antigravity/mcp_config.json
        const legacyPath = path.join(geminiDir, 'antigravity', 'mcp_config.json');
        if (fs.existsSync(legacyPath)) {
            let legacyConfig = { mcpServers: {} };
            try { legacyConfig = JSON.parse(fs.readFileSync(legacyPath, 'utf8')); } catch { /* ignore */ }
            if (!legacyConfig.mcpServers) legacyConfig.mcpServers = {};
            legacyConfig.mcpServers["uicanvas"] = mcpEntry;
            fs.writeFileSync(legacyPath, JSON.stringify(legacyConfig, null, 2));
        }
    } catch (err) {
        console.error('Failed to configure Antigravity MCP:', err);
    }

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
                if (line.startsWith('__UICANVAS_SAVE__')) {
                    const jsonStr = line.replace('__UICANVAS_SAVE__', '');
                    handleSaveFromFrontend(jsonStr);
                }
                if (line.startsWith('__UICANVAS_BIND_FILE__')) {
                    const jsonStr = line.replace('__UICANVAS_BIND_FILE__', '');
                    handleBindFileSignal(jsonStr);
                }
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

    // ── 3. Sidebar Tree View ────────────────────────
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

    // ── 4. Custom Editor Provider ───────────────────
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            UICanvasEditorProvider.viewType,
            new UICanvasEditorProvider(context),
            { webviewOptions: { retainContextWhenHidden: true } }
        )
    );

    // ── 5. Commands ─────────────────────────────────
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
            vscode.commands.executeCommand('uicanvas.openFile', filePath);
        }),
        vscode.commands.registerCommand('uicanvas.refresh', () => treeProvider.refresh()),
        vscode.commands.registerCommand('uicanvas.openFile', async (filePath) => {
            currentFilePath = filePath;
            openPanel(context, false);
            // 轮询等待服务就绪后加载文件内容
            const ready = await waitForServerReady();
            if (ready) {
                loadFileIntoPanel(filePath);
            } else {
                // 降级：延迟后尝试
                setTimeout(() => loadFileIntoPanel(filePath), 3000);
            }
        }),
        vscode.commands.registerCommand('uicanvas.save', () => {
            requestSaveFromFrontend();
        }),
    );
}


// ═════════════════════════════════════════════════════════════
// Save / Load / Bind
// ═════════════════════════════════════════════════════════════

/** 请求前端序列化当前画布状态 */
function requestSaveFromFrontend() {
    if (!serverProcess) return;
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
            // 没有文件路径，自动生成
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

/** 处理 MCP init_project 发出的文件绑定信号 */
function handleBindFileSignal(jsonStr) {
    try {
        const { fileName } = JSON.parse(jsonStr);
        if (!fileName) return;
        const dir = ensureUICanvasDir();
        if (!dir) return;
        const filePath = path.join(dir, `${fileName}.uicanvas`);
        // 如果文件不存在，创建空文件
        if (!fs.existsSync(filePath)) {
            const emptyDoc = {
                version: 1,
                projectName: fileName,
                designTokens: {},
                artboards: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            fs.writeFileSync(filePath, JSON.stringify(emptyDoc, null, 2));
        }
        currentFilePath = filePath;
        console.log(`[UICanvas] Bound to file: ${currentFilePath}`);
    } catch (err) {
        console.error('[UICanvas] Bind file failed:', err);
    }
}

/** 加载文件内容到面板的画布中 */
function loadFileIntoPanel(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return;
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
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
            iframe { width: 100%; height: 100%; border: none; display: none; }
            .loading { position: fixed; inset: 0; font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #888; font-size: 14px; background: #1e1e1e; gap: 12px; }
            .spinner { width: 24px; height: 24px; border: 2px solid #333; border-top-color: #6366f1; border-radius: 50%; animation: spin 1s linear infinite; }
            @keyframes spin { to { transform: rotate(360deg); } }
        </style>
    </head>
    <body>
        <div id="loader" class="loading">
            <div class="spinner"></div>
            <span id="loader-text">Connecting to UICanvas...</span>
        </div>
        <iframe id="canvas-frame" src="about:blank"></iframe>
        <script>
            const iframe = document.getElementById('canvas-frame');
            const loader = document.getElementById('loader');
            const loaderText = document.getElementById('loader-text');
            let attempts = 0;
            const maxAttempts = 60; // 30 seconds max

            function tryLoad() {
                attempts++;
                if (attempts > maxAttempts) {
                    loaderText.textContent = 'Failed to connect. Please Reload Window.';
                    return;
                }
                fetch('http://localhost:${port}/__status__')
                    .then(r => r.json())
                    .then(data => {
                        if (data.ready) {
                            iframe.src = 'http://localhost:${port}';
                            iframe.onload = () => {
                                loader.style.display = 'none';
                                iframe.style.display = 'block';
                            };
                        } else {
                            setTimeout(tryLoad, 500);
                        }
                    })
                    .catch(() => {
                        loaderText.textContent = 'Waiting for server... (' + attempts + ')';
                        setTimeout(tryLoad, 500);
                    });
            }
            setTimeout(tryLoad, 300);
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
    if (serverProcess) {
        try { serverProcess.kill('SIGKILL'); } catch { /* ignore */ }
        serverProcess = null;
    }
    if (panel) { panel.dispose(); panel = null; }
    try {
        const filePort = fs.readFileSync(PORT_FILE, 'utf8').trim();
        if (String(activePort) === filePort) {
            fs.unlinkSync(PORT_FILE);
        }
    } catch { /* ignore */ }
}

module.exports = { activate, deactivate };
