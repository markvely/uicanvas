// server.js — Express + WebSocket + MCP stdio 入口
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { WSBridge } from './lib/ws-bridge.js';
import { ArtboardManager } from './lib/artboard-manager.js';
import { ProjectManager } from './lib/project-manager.js';
import { registerTools } from './lib/mcp-tools.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isStdio = process.argv.includes('--stdio');

// 读取 --port 参数（HTTP 服务器模式下由 extension.cjs 传入）
function getPortArg() {
  const idx = process.argv.indexOf('--port');
  if (idx !== -1 && process.argv[idx + 1]) {
    return parseInt(process.argv[idx + 1], 10);
  }
  return null;
}

// ── 端口解析策略 ─────────────────────────────────────────
// HTTP 服务器模式: 使用 --port 参数 (由 extension.cjs 传入)
// Stdio 模式: 从 /tmp/uicanvas.port 读取活跃窗口的端口
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

function readPortFile() {
  try {
    const portFile = join(tmpdir(), 'uicanvas.port');
    const content = readFileSync(portFile, 'utf8').trim();
    const port = parseInt(content, 10);
    return port > 0 ? port : null;
  } catch {
    return null;
  }
}

let PORT;
if (isStdio) {
  // Stdio 进程从端口文件读取活跃窗口的 HTTP 服务器端口
  PORT = readPortFile() || getPortArg() || 3200;
} else {
  PORT = getPortArg() || process.env.PORT || 3200;
}

// ── Diagnostic logging (写入文件，不污染 stdout/stderr) ────
import { appendFileSync } from 'node:fs';
const _logFile = '/tmp/uicanvas-stdio.log';
function _log(msg) {
  if (!isStdio) return;
  try { appendFileSync(_logFile, `[${new Date().toISOString()}] ${msg}\n`); } catch {}
}
_log(`=== STDIO PROCESS START pid=${process.pid} PORT=${PORT} (from portFile=${readPortFile()})`);

// 全局异常捕获
process.on('uncaughtException', (err) => { _log(`UNCAUGHT: ${err.stack}`); });
process.on('unhandledRejection', (err) => { _log(`UNHANDLED_REJECT: ${err?.stack || err}`); });
process.on('exit', (code) => { _log(`PROCESS EXIT code=${code}`); });
process.on('SIGTERM', () => { _log('SIGTERM received'); });
process.on('SIGINT', () => { _log('SIGINT received'); });

// ── Shared state ───────────────────────────────────────────
const bridge = new WSBridge();
const artboards = new ArtboardManager();
const project = new ProjectManager();

// ── MCP Server (高层 API) ──────────────────────────────────
const mcpServer = new McpServer(
  { name: 'uicanvas', version: '1.1.10' },
  { capabilities: { tools: {} } }
);
registerTools(mcpServer, bridge, artboards, project);

// ── HTTP + WebSocket (best-effort) ─────────────────────────
const app = express();
app.use(express.static(join(__dirname, 'public')));
app.use('/components', express.static(join(__dirname, 'components')));
// Landing page available at /welcome
app.get('/welcome', (_req, res) => res.sendFile(join(__dirname, 'public', 'welcome.html')));

// ── Save/Load endpoints (extension <-> frontend via HTTP server) ──
app.use(express.json({ limit: '50mb' }));

app.post('/__save__', (_req, res) => {
  // 广播保存请求到前端 Webview，前端序列化后通过 WS 返回
  for (const client of bridge.clients) {
    if (client.readyState === 1 && !client.isRemoteStdio) {
      client.send(JSON.stringify({ type: '__request_save__' }));
    }
  }
  res.json({ ok: true });
});

app.post('/__load__', (req, res) => {
  const data = req.body;
  // 广播加载命令到前端 Webview
  for (const client of bridge.clients) {
    if (client.readyState === 1 && !client.isRemoteStdio) {
      client.send(JSON.stringify({ type: 'load_canvas', data }));
    }
  }
  res.json({ ok: true });
});

// ── 接收前端保存的数据并输出到 stdout（extension 捕获）──
function handleSaveData(data) {
  if (!isStdio) {
    // HTTP server 模式：输出到 stdout 让 extension 捕获
    console.log('__UICANVAS_SAVE__' + JSON.stringify(data));
  }
}

const httpServer = createServer(app);

if (isStdio) {
  // ── Stdio 模式：永远不启动自己的 HTTP 服务器 ──
  // 直接作为 WS Bridge 连接到扩展的 HTTP 服务器
  _log('Stdio mode: skipping HTTP server, connecting as remote client');
  connectAsRemoteClient();
} else {
  // ── HTTP 服务器模式（由扩展 spawn）──
  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n  ❌ Port ${PORT} is already in use. Is another UICanvas running?\n`);
      process.exit(1);
    }
    throw err;
  });

  httpServer.listen(PORT, () => {
  // Port bound successfully — create WebSocket server
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws, req) => {
    ws.isRemoteStdio = req && req.url ? req.url.includes('role=stdio') : false;
    bridge.addClient(ws);

    // Re-broadcast: 当收到来自远程 stdio 进程转发的消息时，
    // 分发给所有本地 Webview 客户端
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        // 处理前端保存数据
        if (msg.type === '__save_data__') {
          handleSaveData(msg.data);
          return;
        }
        // 处理 dirty 状态通知
        if (msg.type === '__dirty__') {
          if (!isStdio) console.log('__UICANVAS_DIRTY__');
          return;
        }

        // 如果消息包含 type 字段（是 MCP 命令转发），re-broadcast 给其他客户端
        if (msg.type && !msg.requestId) {
          // 这是广播消息，转发给其他客户端
          for (const client of bridge.clients) {
            if (client !== ws && client.readyState === 1) {
              client.send(raw.toString());
            }
          }
        } else if (msg.type && msg.requestId) {
          // 仅在 __open_canvas__ 命令时触发 IDE 打开面板
          // 其他命令不应打开/刷新面板，否则会导致画布重载和焦点抢夺
          if (msg.type === '__open_canvas__') {
            console.log('__UICANVAS_OPEN_PANEL__');
          }

          const dispatch = (attempts = 0) => {
            let sent = false;
            // 这是 sendCommand 请求，转发给第一个真正的 Webview 客户端（排除其他 stdio 桥接进程）
            for (const client of bridge.clients) {
              if (client !== ws && client.readyState === 1 && !client.isRemoteStdio) {
                client.send(raw.toString());
                sent = true;
                // 监听这个客户端的响应，转发回发送者
                const onReply = (replyRaw) => {
                  try {
                    const reply = JSON.parse(replyRaw.toString());
                    if (reply.requestId === msg.requestId) {
                      ws.send(replyRaw.toString());
                      client.removeListener('message', onReply);
                    }
                  } catch { /* ignore */ }
                };
                client.on('message', onReply);
                // 超时清理
                setTimeout(() => client.removeListener('message', onReply), 20000);
                break;
              }
            }

            // 如果没有活跃的 Webview 客户端（面板正在加载），进行等待重试（最多 20 秒）
            if (!sent && attempts < 40) {
              setTimeout(() => dispatch(attempts + 1), 500);
            } else if (!sent) {
              // 最终超时失败，回推 error 防止发送方无限等待
              ws.send(JSON.stringify({
                requestId: msg.requestId,
                error: 'Timeout waiting for Webview panel to open and connect'
              }));
            }
          };

          dispatch();
        }
      } catch { /* ignore non-JSON */ }
    });

    if (!isStdio) {
      console.log(`[ws] Canvas client connected (${bridge.clientCount} active)`);
    }
    ws.on('close', () => {
      if (!isStdio) {
        console.log(`[ws] Canvas client disconnected (${bridge.clientCount} active)`);
      }
    });
  });

  if (!isStdio) {
    console.log(`\n  🎨 UICanvas running at http://localhost:${PORT}\n`);
  }
  });
} // end of !isStdio block

// ── stdio 远程桥接 ─────────────────────────────────────────

function connectAsRemoteClient() {
  // 每次连接/重连时重新读取端口文件，感知 Reload Window 导致的端口变化
  const currentPort = readPortFile() || PORT;
  const url = `ws://localhost:${currentPort}/?role=stdio`;
  _log(`Connecting to ${url} (portFile=${readPortFile()})`);
  const ws = new WebSocket(url);

  ws.on('open', () => {
    _log('Remote WS CONNECTED');
    bridge.setRemote(ws);
  });

  ws.on('error', (err) => {
    _log(`Remote WS ERROR: ${err?.message}`);
    // 连接失败 — HTTP 服务器可能还没启动，稍后重试
    setTimeout(() => connectAsRemoteClient(), 1000);
  });

  ws.on('close', () => {
    bridge.remoteWs = null;
    // 尝试重连
    setTimeout(() => connectAsRemoteClient(), 2000);
  });
}

// ── MCP Transport ──────────────────────────────────────────
if (isStdio) {
  _log('Starting StdioServerTransport...');
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  _log('MCP transport connected, stdio server is READY');
} else {
  console.log('  ℹ  Run with --stdio to enable MCP transport\n');
}
