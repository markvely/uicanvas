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

// ── Shared state ───────────────────────────────────────────
const bridge = new WSBridge();
const artboards = new ArtboardManager();
const project = new ProjectManager();

// ── MCP Server (高层 API) ──────────────────────────────────
const mcpServer = new McpServer(
  { name: 'uicanvas', version: '1.1.5' },
  { capabilities: { tools: {} } }
);
registerTools(mcpServer, bridge, artboards, project);

// ── HTTP + WebSocket (best-effort) ─────────────────────────
// In stdio mode the MCP transport works over stdin/stdout.
// The HTTP/WS server is nice-to-have (serves the canvas UI),
// but if the port is already taken by another instance, we
// simply skip it and keep the MCP channel alive.
const app = express();
app.use(express.static('public'));
app.use('/components', express.static('components'));

const httpServer = createServer(app);

// Catch port conflicts BEFORE .listen() triggers them
httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    if (isStdio) {
      // Another UICanvas is already serving the UI — that's fine.
      // MCP stdio transport continues working independently.
      return;
    }
    console.error(`\n  ❌ Port ${PORT} is already in use. Is another UICanvas running?\n`);
    process.exit(1);
  }
  throw err;
});

// Only create WebSocket AFTER we know the server will start
httpServer.listen(PORT, () => {
  const wss = new WebSocketServer({ server: httpServer });
  wss.on('connection', (ws) => {
    bridge.addClient(ws);
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

// ── MCP Transport ──────────────────────────────────────────
if (isStdio) {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
} else {
  console.log('  ℹ  Run with --stdio to enable MCP transport\n');
}
