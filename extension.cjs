// extension.cjs
const vscode = require('vscode');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');

let serverProcess = null;
let panel = null;
let activePort = 3200; // 当前窗口使用的端口

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

async function activate(context) {
    console.log('UICanvas extension activated.');

    // ── 0. 清理旧版本残留进程 ──────────────────────
    cleanupStaleProcesses(context.extensionPath);

    // ── 1. 找到空闲端口并启动 HTTP 服务器 ────────────
    if (!serverProcess) {
        activePort = await findFreePort();
        const portFile = path.join(os.tmpdir(), 'uicanvas.port');

        const serverPath = path.join(context.extensionPath, 'server.js');
        serverProcess = spawn('node', [serverPath, '--port', String(activePort)], {
            cwd: context.extensionPath,
            env: process.env,
            stdio: 'pipe',
        });

        // 修复流读取问题，按行缓冲避免数据截断
        let outBuf = '';
        serverProcess.stdout.on('data', (data) => {
            outBuf += data.toString();
            const lines = outBuf.split('\n');
            outBuf = lines.pop(); // 保留不完整的一行
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

        // 写入端口文件供 stdio 进程读取
        try { fs.writeFileSync(portFile, String(activePort)); } catch {}
        console.log(`[UICanvas] HTTP server starting on port ${activePort}`);
    }

    // ── 2. 注入 MCP 配置（带端口参数）────────────────
    try {
        const configPath = path.join(os.homedir(), '.gemini', 'antigravity', 'mcp_config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const serverJsPath = path.join(context.extensionPath, 'server.js');

            if (!config.mcpServers) config.mcpServers = {};
            config.mcpServers["uicanvas"] = {
                "command": "node",
                "args": [serverJsPath, "--stdio", "--port", String(activePort)]
            };

            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            console.log(`Successfully injected UICanvas into Antigravity MCP config (port ${activePort})!`);
        }
    } catch (err) {
        console.error('Failed to configure Antigravity MCP:', err);
    }

    // ── 3. Register manual command (for re-opening) ────────
    let disposable = vscode.commands.registerCommand('uicanvas.start', function () {
        openPanel(context);
    });

    context.subscriptions.push(disposable);
}

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
            <span>Connecting to canvas server على port ${port}...</span>
        </div>
        <iframe id="canvas-frame" src="about:blank" onload="document.getElementById('loader').style.display='none'"></iframe>
        <script>
            // 重试机制：如果 iframe 因为连接被拒而加载白屏，定时触发强制刷新
            let iframe = document.getElementById('canvas-frame');
            function tryLoad() {
                iframe.src = 'http://localhost:${port}';
            }
            setTimeout(tryLoad, 500);
            
            // 为了防止 localhost 拒绝连接后卡死，每 3 秒刷新一次 iframe 直到 Webview 的内容被接管（Webview 内会自己发起 WS）
            // 我们通过检测同源策略：如果 iframe 成功加载，我们可以访问 iframe.contentWindow.location，如果没有成功加载（比如 error page），访问可能会报错或返回 origin 为 null。
            // 简单处理：我们就不强行重试了，我们完全依赖 VSCode 的 HTML 更新机制。
        </script>
    </body>
    </html>`;
}

function openPanel(context, preserveFocus = false) {
    // If panel already open, just reveal it
    if (panel) {
        try {
            // 强制重新注入最新的 HTML（带最新端口），解决 Reload Window 后面板残留旧端口的 Bug
            panel.webview.html = getWebviewHTML(activePort);
            panel.reveal(vscode.ViewColumn.Two, preserveFocus);
            return;
        } catch {
            panel = null; // Panel was disposed
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

function deactivate() {
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
