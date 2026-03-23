// server.js — Express + WebSocket + MCP stdio 入口
import { createServer } from 'node:http';
import express from 'express';
import { WebSocketServer } from 'ws';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { WSBridge } from './lib/ws-bridge.js';
import { ArtboardManager } from './lib/artboard-manager.js';
import { ProjectManager } from './lib/project-manager.js';
import { registerTools } from './lib/mcp-tools.js';

const PORT = process.env.PORT || 3200;
const isStdio = process.argv.includes('--stdio');

// ── Express ────────────────────────────────────────────────
const app = express();
app.use(express.static('public'));
app.use('/components', express.static('components'));

// ── HTTP + WebSocket ───────────────────────────────────────
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const bridge = new WSBridge();
const artboards = new ArtboardManager();
const project = new ProjectManager();

wss.on('connection', (ws) => {
  bridge.addClient(ws);
  const count = bridge.clientCount;
  if (!isStdio) {
    console.log(`[ws] Canvas client connected (${count} active)`);
  }
  ws.on('close', () => {
    if (!isStdio) {
      console.log(`[ws] Canvas client disconnected (${bridge.clientCount} active)`);
    }
  });
});

// ── MCP Server (高层 API) ──────────────────────────────────
const mcpServer = new McpServer(
  { name: 'uicanvas', version: '1.1.0' },
  { capabilities: { tools: {} } }
);
registerTools(mcpServer, bridge, artboards, project);

// ── 启动 ───────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  if (!isStdio) {
    console.log(`\n  🎨 UICanvas running at http://localhost:${PORT}\n`);
  }
});

if (isStdio) {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
} else {
  console.log('  ℹ  Run with --stdio to enable MCP transport\n');
}
