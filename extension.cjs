// extension.cjs
const vscode = require('vscode');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

let serverProcess = null;

function activate(context) {
    console.log('UICanvas extension activated.');

    // Auto-inject MCP Configuration for Antigravity & AI
    try {
        const configPath = path.join(os.homedir(), '.gemini', 'antigravity', 'mcp_config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const serverJsPath = path.join(context.extensionPath, 'server.js');
            
            if (!config.mcpServers) config.mcpServers = {};
            // Inject pointing to THIS extension's bundled server
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

    let disposable = vscode.commands.registerCommand('uicanvas.start', function () {
        // 1. Spawns the Node server in the background (if not already running)
        if (!serverProcess) {
            const serverPath = path.join(context.extensionPath, 'server.js');
            serverProcess = spawn('node', [serverPath], {
                cwd: context.extensionPath,
                env: process.env
            });
            
            serverProcess.stdout.on('data', (data) => console.log(`[UICanvas Node] ${data}`));
            serverProcess.stderr.on('data', (data) => console.error(`[UICanvas Error] ${data}`));
        }

        // 2. Open a VSCode Webview Tab
        const panel = vscode.window.createWebviewPanel(
            'uiCanvas',
            '🎨 UICanvas',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        // 3. Render Canvas Iframe pointing to the local port
        panel.webview.html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>UICanvas</title>
            <style>
                body, html { margin: 0; padding: 0; height: 100%; border: none; overflow: hidden; background: #fff; }
                iframe { width: 100%; height: 100%; border: none; }
                .loading { position: fixed; inset: 0; font-family: sans-serif; display: flex; align-items: center; justify-content: center; color: #666; font-size: 14px; background: #fafafa; }
            </style>
        </head>
        <body>
            <div id="loader" class="loading">Booting local design server...</div>
            <iframe id="canvas-frame" src="about:blank" onload="document.getElementById('loader').style.display='none'"></iframe>
            <script>
                // Give Node.js 1.5 seconds to start Express before navigating the iframe
                setTimeout(() => {
                    document.getElementById('canvas-frame').src = 'http://localhost:3200';
                }, 1500);
            </script>
        </body>
        </html>`;
    });

    context.subscriptions.push(disposable);
}

function deactivate() {
    if (serverProcess) {
        serverProcess.kill();
    }
}

module.exports = {
    activate,
    deactivate
}
