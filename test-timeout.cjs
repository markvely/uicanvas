const { spawn } = require('child_process');
const WebSocket = require('ws');
const path = require('path');

const basePath = '/Users/mark/Documents/项目/design-canvas-mcp';

// 1. Start HTTP Server
const httpSrv = spawn('node', [path.join(basePath, 'server.js')], { cwd: basePath });
httpSrv.stdout.on('data', d => console.log('[HTTP OUT]', d.toString().trim()));
httpSrv.stderr.on('data', d => console.log('[HTTP ERR]', d.toString().trim()));

setTimeout(() => {
  // 2. Start Webview client
  const webview = new WebSocket('ws://localhost:3200');
  webview.on('open', () => console.log('[Webview] Connected'));
  webview.on('message', raw => {
    console.log('[Webview] Received:', raw.toString());
    const msg = JSON.parse(raw);
    if (msg.type === 'get_basic_info' && msg.requestId) {
      setTimeout(() => {
        webview.send(JSON.stringify({
          requestId: msg.requestId,
          result: { ok: true, msg: "from webview" }
        }));
        console.log('[Webview] Sent Response');
      }, 100);
    }
  });

  setTimeout(() => {
    // 3. Start MCP Stdio Server
    const stdioSrv = spawn('node', [path.join(basePath, 'server.js'), '--stdio'], { cwd: basePath });
    let stdout = '';
    stdioSrv.stdout.on('data', d => {
      stdout += d.toString();
      if (stdout.includes('\n')) {
        const lines = stdout.split('\n');
        stdout = lines.pop(); // keep remainder
        for (const line of lines) {
          if (!line) continue;
          console.log('[MCP OUT]', line.substring(0, 500));
        }
      }
    });
    stdioSrv.stderr.on('data', d => console.log('[MCP ERR]', d.toString().trim()));

    setTimeout(() => {
      // Initialize MCP
      const init = {
        jsonrpc:'2.0', id:1, method:'initialize',
        params:{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'test',version:'1.0'}}
      };
      stdioSrv.stdin.write(JSON.stringify(init) + '\n');

      setTimeout(() => {
        // Send initialized notification
        const initialized = { jsonrpc:'2.0', method:'notifications/initialized' };
        stdioSrv.stdin.write(JSON.stringify(initialized) + '\n');
        
        // Output an extra message just in case
        const toolsList = { jsonrpc:'2.0', id:10, method:'tools/list' };
        stdioSrv.stdin.write(JSON.stringify(toolsList) + '\n');

        setTimeout(() => {
          // Call get_basic_info
          const call = {
            jsonrpc:'2.0', id:2, method:'tools/call',
            params: { name: 'get_basic_info', arguments: {} }
          };
          console.log('--- CALLING get_basic_info ---');
          stdioSrv.stdin.write(JSON.stringify(call) + '\n');

          setTimeout(() => {
            httpSrv.kill();
            stdioSrv.kill();
            process.exit(0);
          }, 3000);
        }, 500);
      }, 500);
    }, 500);
  }, 1000);
}, 1000);
