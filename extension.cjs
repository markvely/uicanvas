// extension.cjs
const vscode = require('vscode');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

let serverProcess = null;
let panel = null;

function activate(context) {
    console.log('UICanvas extension activated.');

    // ── 1. Auto-inject MCP Configuration ───────────────────
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
            console.log('Successfully injected UICanvas into Antigravity MCP config!');
        }
    } catch (err) {
        console.error('Failed to configure Antigravity MCP:', err);
    }

    // ── 2. Auto-spawn HTTP server on activation ────────────
    if (!serverProcess) {
        const serverPath = path.join(context.extensionPath, 'server.js');
        serverProcess = spawn('node', [serverPath], {
            cwd: context.extensionPath,
            env: process.env,
            stdio: 'pipe',
        });
        
        serverProcess.stdout.on('data', (data) => console.log(`[UICanvas] ${data}`));
        serverProcess.stderr.on('data', (data) => console.error(`[UICanvas Error] ${data}`));
        serverProcess.on('close', (code) => {
            console.log(`[UICanvas] HTTP server exited with code ${code}`);
            serverProcess = null;
        });
    }

    // ── 3. Auto-open Webview panel after brief delay ───────
    setTimeout(() => {
        openPanel(context);
    }, 2000); // Give the HTTP server time to start

    // ── 4. Register manual command (for re-opening) ────────
    let disposable = vscode.commands.registerCommand('uicanvas.start', function () {
        openPanel(context);
    });

    context.subscriptions.push(disposable);
}

function openPanel(context) {
    // If panel already open, just reveal it
    if (panel) {
        try {
            panel.reveal(vscode.ViewColumn.Two);
            return;
        } catch {
            panel = null; // Panel was disposed
        }
    }

    panel = vscode.window.createWebviewPanel(
        'uiCanvas',
        '🎨 UICanvas',
        vscode.ViewColumn.Two,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
        }
    );

    panel.onDidDispose(() => {
        panel = null;
    });

    panel.webview.html = `<!DOCTYPE html>
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
            <span>Connecting to canvas server...</span>
        </div>
        <iframe id="canvas-frame" src="about:blank" onload="document.getElementById('loader').style.display='none'"></iframe>
        <script>
            // Retry loading until server is ready
            let attempts = 0;
            function tryLoad() {
                attempts++;
                const frame = document.getElementById('canvas-frame');
                frame.src = 'http://localhost:3200';
                frame.onerror = () => {
                    if (attempts < 10) {
                        setTimeout(tryLoad, 1500);
                    }
                };
            }
            setTimeout(tryLoad, 500);
        </script>
    </body>
    </html>`;
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
