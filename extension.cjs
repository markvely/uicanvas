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
let activeWorkspacePath = ''; // 当前窗口的工作区路径

/**
 * 清理旧版本进程：只杀死来自更旧扩展目录的 uicanvas server.js 进程
 */
function cleanupStaleProcesses(currentExtPath) {
    try {
        const extPath = currentExtPath || '';
        if (!extPath) return;
        const cmd = `ps aux | grep "[n]ode.*uicanvas-" | grep -Fv "${extPath}" | awk '{print $2}' | xargs kill -9 2>/dev/null || true`;
        execSync(cmd, { stdio: 'ignore' });
    } catch { /* ignore */ }
}

/**
 * 找到一个空闲端口
 */
function findFreePort() {
    return new Promise((resolve) => {
        const srv = net.createServer();
        srv.listen(0, () => {
            const port = srv.address().port;
            srv.close(() => resolve(port));
        });
    });
}

/**
 * 路径规整函数 — 保证同一个物理路径在任何上下文中产生相同的 Key
 * 与 lib/workspace-registry.js 中的 getWorkspaceKey 完全一致
 */
function getWorkspaceKey(rawPath) {
    try {
        return fs.realpathSync(rawPath).toLowerCase();
    } catch {
        return rawPath.toLowerCase();
    }
}

/**
 * 注册表路径: ~/.uicanvas/registry.json
 */
const REGISTRY_DIR  = path.join(os.homedir(), '.uicanvas');
const REGISTRY_FILE = path.join(REGISTRY_DIR, 'registry.json');

function readRegistry() {
    try {
        if (fs.existsSync(REGISTRY_FILE)) {
            return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
        }
    } catch { /* corrupt, start fresh */ }
    return {};
}

function writeRegistry(data) {
    try {
        if (!fs.existsSync(REGISTRY_DIR)) {
            fs.mkdirSync(REGISTRY_DIR, { recursive: true });
        }
        fs.writeFileSync(REGISTRY_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('[UICanvas Registry] Write failed:', err.message);
    }
}

function registerPort(workspacePath, port) {
    const key = getWorkspaceKey(workspacePath);
    const registry = readRegistry();
    registry[key] = { port, pid: process.pid, ts: Date.now() };
    writeRegistry(registry);
    console.log(`[UICanvas Registry] Registered: ${key} → port ${port}`);
    return key;
}

function unregisterPort(workspacePath) {
    const key = getWorkspaceKey(workspacePath);
    const registry = readRegistry();
    delete registry[key];
    writeRegistry(registry);
    console.log(`[UICanvas Registry] Unregistered: ${key}`);
}


// ═════════════════════════════════════════════════════════════
// Extension Lifecycle
// ═════════════════════════════════════════════════════════════

async function activate(context) {
    console.log('UICanvas extension activated.');

    // ── 0. 清理旧版本残留进程 ──────────────────────
    cleanupStaleProcesses(context.extensionPath);

    // ── 1. 确定当前窗口的工作区路径 ──────────────────
    const wsFolders = vscode.workspace.workspaceFolders;
    activeWorkspacePath = wsFolders && wsFolders.length > 0
        ? wsFolders[0].uri.fsPath
        : os.homedir(); // fallback: 无工作区时用 home 目录

    // ── 2. 找到空闲端口并启动 HTTP 服务器 ────────────
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
                    openPanel(context, false);
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

    // ── 3. 写入端口注册表（按工作区路径索引）────────
    registerPort(activeWorkspacePath, activePort);

    // ── 4. 注入 MCP 配置（纯净，不带 --port）─────────
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
            console.log('Successfully injected UICanvas into Antigravity MCP config (no --port, uses registry).');
        }
    } catch (err) {
        console.error('Failed to configure Antigravity MCP:', err);
    }

    // ── 5. Register manual command (for re-opening) ────────
    let disposable = vscode.commands.registerCommand('uicanvas.start', function () {
        openPanel(context);
    });

    context.subscriptions.push(disposable);
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
            function tryLoad() {
                iframe.src = 'http://localhost:${port}';
            }
            setTimeout(tryLoad, 500);
        </script>
    </body>
    </html>`;
}

function openPanel(context, preserveFocus = false) {
    if (panel) {
        try {
            panel.webview.html = getWebviewHTML(activePort);
            panel.reveal(vscode.ViewColumn.Two, preserveFocus);
            return;
        } catch {
            panel = null;
        }
    }

    panel = vscode.window.createWebviewPanel(
        'uiCanvas',
        '🎨 UICanvas',
        { viewColumn: vscode.ViewColumn.Two, preserveFocus },
        {
            enableScripts: true,
            retainContextWhenHidden: true,
        }
    );

    panel.onDidDispose(() => {
        panel = null;
    });

    panel.webview.html = getWebviewHTML(activePort);
}


// ═════════════════════════════════════════════════════════════
// Deactivation
// ═════════════════════════════════════════════════════════════

function deactivate() {
    // 注销注册表条目
    if (activeWorkspacePath) {
        unregisterPort(activeWorkspacePath);
    }
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
    if (panel) {
        panel.dispose();
        panel = null;
    }
}

module.exports = {
    activate,
    deactivate
}
