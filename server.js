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
const PORT = process.env.PORT || 3200;
const isStdio = process.argv.includes('--stdio');

// ── Shared state ───────────────────────────────────────────
const bridge = new WSBridge();
const artboards = new ArtboardManager();
const project = new ProjectManager();

// ── MCP Server (高层 API) ──────────────────────────────────
const mcpServer = new McpServer(
  { name: 'uicanvas', version: '1.1.7' },
  { capabilities: { tools: {} } }
);
registerTools(mcpServer, bridge, artboards, project);

// ── HTTP + WebSocket (best-effort) ─────────────────────────
const app = express();
app.use(express.static(join(__dirname, 'public')));
app.use('/components', express.static(join(__dirname, 'components')));

const httpServer = createServer(app);

// Catch port conflicts BEFORE .listen() triggers them
httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    if (isStdio) {
      // Port occupied — connect as WS Client to forward commands
      connectAsRemoteClient();
      return;
    }
    console.error(`\n  ❌ Port ${PORT} is already in use. Is another UICanvas running?\n`);
    process.exit(1);
  }
  throw err;
});

httpServer.listen(PORT, () => {
  // Port bound successfully — create WebSocket server
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    bridge.addClient(ws);

    // Re-broadcast: 当收到来自远程 stdio 进程转发的消息时，
    // 分发给所有本地 Webview 客户端
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        // 如果消息包含 type 字段（是 MCP 命令转发），re-broadcast 给其他客户端
        if (msg.type && !msg.requestId) {
          // 这是广播消息，转发给其他客户端
          for (const client of bridge.clients) {
            if (client !== ws && client.readyState === 1) {
              client.send(raw.toString());
            }
          }
        } else if (msg.type && msg.requestId) {
          // 收到带 ID 的具体请求命令，触发 IDE 自动打开/前置画板
          console.log('__UICANVAS_OPEN_PANEL__');

          const dispatch = (attempts = 0) => {
            let sent = false;
            // 这是 sendCommand 请求，转发给第一个 Webview 客户端
            for (const client of bridge.clients) {
              if (client !== ws && client.readyState === 1) {
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

            // 如果没有活跃的 Webview 客户端（面板正在加载），进行等待重试（最多 10 秒）
            if (!sent && attempts < 20) {
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

// ── stdio 远程桥接 ─────────────────────────────────────────

function connectAsRemoteClient() {
  const url = `ws://localhost:${PORT}`;
  const ws = new WebSocket(url);

  ws.on('open', () => {
    bridge.setRemote(ws);
  });

  ws.on('error', () => {
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
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
} else {
  console.log('  ℹ  Run with --stdio to enable MCP transport\n');
}
