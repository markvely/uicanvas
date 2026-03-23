// lib/mcp-tools.js — MCP 工具注册 (McpServer 高层 API)
import { z } from 'zod';

/**
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('./ws-bridge.js').WSBridge} bridge
 * @param {import('./artboard-manager.js').ArtboardManager} artboards
 */
export function registerTools(server, bridge, artboards) {

  server.tool('get_basic_info',
    'Get canvas info: artboard list, node count.',
    {},
    async () => {
      const result = await bridge.sendCommand('get_basic_info');
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool('create_artboard',
    'Create a new artboard on the canvas. Use project/page/state for structured naming (e.g. "MyApp / Login / Default").',
    {
      name: z.string().describe('Artboard name (used when project/page/state not set)'),
      width: z.number().describe('Width in pixels'),
      height: z.number().describe('Height in pixels'),
      project: z.string().optional().describe('Project name, e.g. "MyApp"'),
      page: z.string().optional().describe('Page name, e.g. "Login"'),
      state: z.string().optional().describe('State name, e.g. "Default" or "Error"'),
      styles: z.record(z.string()).optional().describe('CSS styles object'),
    },
    async ({ name, width, height, project, page, state, styles }) => {
      const meta = artboards.create({ name, width, height, project, page, state, styles });
      const result = await bridge.sendCommand('create_artboard', meta);
      return { content: [{ type: 'text', text: JSON.stringify({ ...meta, ...result }, null, 2) }] };
    }
  );

  server.tool('write_html',
    'Write HTML into a target node. Modes: "insert-children" or "replace".',
    {
      html: z.string().describe('HTML string to render'),
      targetNodeId: z.string().describe('Target node ID'),
      mode: z.enum(['insert-children', 'replace']).describe('Insert or replace'),
    },
    async (params) => {
      const result = await bridge.sendCommand('write_html', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool('get_children',
    'Get direct children of a node.',
    { nodeId: z.string() },
    async ({ nodeId }) => {
      const result = await bridge.sendCommand('get_children', { nodeId });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool('get_styles',
    'Get computed styles for one or more nodes.',
    { nodeIds: z.array(z.string()) },
    async ({ nodeIds }) => {
      const result = await bridge.sendCommand('get_styles', { nodeIds });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool('get_tree',
    'Get a compact text summary of a node subtree.',
    {
      nodeId: z.string(),
      depth: z.number().optional().default(3),
    },
    async (params) => {
      const result = await bridge.sendCommand('get_tree', params);
      return { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool('get_node_info',
    'Get detailed info about a specific node.',
    { nodeId: z.string() },
    async ({ nodeId }) => {
      const result = await bridge.sendCommand('get_node_info', { nodeId });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool('delete_nodes',
    'Delete one or more nodes.',
    { nodeIds: z.array(z.string()) },
    async ({ nodeIds }) => {
      const result = await bridge.sendCommand('delete_nodes', { nodeIds });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool('update_styles',
    'Update styles on one or more nodes.',
    {
      updates: z.array(z.object({
        nodeIds: z.array(z.string()),
        styles: z.record(z.string()),
      })),
    },
    async ({ updates }) => {
      const result = await bridge.sendCommand('update_styles', { updates });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool('set_text',
    'Set text content of one or more text nodes.',
    {
      updates: z.array(z.object({
        nodeId: z.string(),
        textContent: z.string(),
      })),
    },
    async ({ updates }) => {
      const result = await bridge.sendCommand('set_text', { updates });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool('get_screenshot',
    'Capture a screenshot of a node. Returns base64 JPEG.',
    {
      nodeId: z.string(),
      scale: z.number().optional().default(1),
    },
    async (params) => {
      const result = await bridge.sendCommand('get_screenshot', params);
      if (result?.imageData) {
        return { content: [{ type: 'image', data: result.imageData, mimeType: 'image/jpeg' }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool('duplicate_nodes',
    'Duplicate one or more nodes.',
    { nodeIds: z.array(z.string()) },
    async ({ nodeIds }) => {
      const result = await bridge.sendCommand('duplicate_nodes', { nodeIds });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );
}
