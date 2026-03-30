import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

try {
  const mcpServer = new McpServer(
    { name: 'uicanvas', version: '1.2.6' },
    { capabilities: { tools: {} } }
  );

  mcpServer.tool('test_empty', 'Empty schema', {}, async () => {
    return { content: [{ type: 'text', text: 'hi' }] };
  });

  console.log('✅ SDK Initialized without error');
} catch (err) {
  console.error('❌ ERROR DURING INIT:\n', err);
}
