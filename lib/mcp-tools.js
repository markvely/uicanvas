// lib/mcp-tools.js — MCP 工具注册 (McpServer 高层 API)
import { z } from 'zod';
import { exec } from 'node:child_process';
import { generateSpecTemplate, DEFAULT_TOKENS } from '../components/design-spec-template.js';

/**
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('./ws-bridge.js').WSBridge} bridge
 * @param {import('./artboard-manager.js').ArtboardManager} artboards
 * @param {import('./project-manager.js').ProjectManager} project
 */
export function registerTools(server, bridge, artboards, project) {

  // ── 工作流工具 ──────────────────────────────────────────

  server.tool('init_project',
    `Initialize a new project. This MUST be called before creating any artboards.
UICanvas enforces a design-spec-first workflow:
1. Call init_project → creates a Design Spec artboard automatically
2. Review/customize the spec (colors, fonts, spacing)
3. Call finalize_design_spec → unlocks page artboard creation
4. Now call create_artboard freely for your UI pages`,
    {
      projectName: z.string().describe('Project name, e.g. "MyApp"'),
      designTokens: z.object({
        colors: z.record(z.string()).optional().describe('Override default colors, e.g. { primary: "#FF6B6B" }'),
        fonts: z.record(z.string()).optional().describe('Override default fonts, e.g. { heading: "Inter, sans-serif" }'),
      }).optional().describe('Optional custom design tokens to override defaults'),
    },
    async ({ projectName, designTokens }) => {
      // 初始化项目状态
      project.initProject(projectName);

      // 创建 Design Spec 画板 (宽 680 适合阅读)
      const specMeta = artboards.create({
        name: 'Design Spec',
        width: 680,
        height: 1400,
        project: projectName,
        page: 'Design Spec',
        state: 'v1.0',
      });
      project.setSpecArtboardId(specMeta.id);

      // 渲染画板
      await bridge.sendCommand('create_artboard', specMeta);

      // 填充设计规范模板
      const specHtml = generateSpecTemplate(projectName, designTokens || {});
      await bridge.sendCommand('write_html', {
        targetNodeId: `${specMeta.id}-content`,
        html: specHtml,
        mode: 'insert-children',
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            projectName,
            specArtboardId: specMeta.id,
            state: 'spec_in_progress',
            message: `✅ Project "${projectName}" initialized. Design Spec artboard created.\n\nNext steps:\n1. Review the generated design spec on the canvas\n2. Customize colors/fonts/spacing if needed using write_html or update_styles\n3. When satisfied, call finalize_design_spec to unlock page design`,
            designTokens: { ...DEFAULT_TOKENS, ...designTokens },
          }, null, 2),
        }],
      };
    }
  );

  server.tool('finalize_design_spec',
    'Mark the design specification as complete. This unlocks page artboard creation. Call this after the Design Spec artboard is ready.',
    {},
    async () => {
      try {
        const result = project.finalizeSpec();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              ...result,
              message: `✅ Design spec finalized for "${project.projectName}". You can now freely create page artboards using create_artboard.\n\nRemember to use structured naming: project="${project.projectName}", page="PageName", state="Default"`,
            }, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }],
          isError: true,
        };
      }
    }
  );

  // ── 基本信息 (含项目状态) ─────────────────────────────────

  server.tool('get_basic_info',
    'Get canvas info: artboard list, node count, and project workflow state.',
    {},
    async () => {
      const result = await bridge.sendCommand('get_basic_info');
      result.project = project.toJSON();
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 画板创建 (受工作流约束) ──────────────────────────────

  server.tool('create_artboard',
    `Create a new artboard on the canvas. Use project/page/state for structured naming.
💡 RECOMMENDED WORKFLOW: Call init_project first to establish design specs (colors, fonts, spacing) before creating page artboards.`,
    {
      name: z.string().describe('Artboard name (used when project/page/state not set)'),
      width: z.number().describe('Width in pixels'),
      height: z.number().describe('Height in pixels'),
      project: z.string().optional().describe('Project name, e.g. "MyApp"'),
      page: z.string().optional().describe('Page name, e.g. "Login"'),
      state: z.string().optional().describe('State name, e.g. "Default" or "Error"'),
      styles: z.record(z.string()).optional().describe('CSS styles object'),
    },
    async ({ name, width, height, project: proj, page, state, styles }) => {
      // 建议性工作流检查
      const check = project.canCreateArtboard();

      const meta = artboards.create({ name, width, height, project: proj, page, state, styles });
      const result = await bridge.sendCommand('create_artboard', meta);

      const response = { ...meta, ...result };
      if (check.warning) {
        response._workflow_hint = check.warning;
      }
      return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
    }
  );

  // ── 其他工具 (不受工作流约束) ─────────────────────────────

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

  server.tool('open_uicanvas_browser',
    "Open the UICanvas frontend in the user's default web browser. ALWAYS call this tool FIRST before starting any design work so the user can see what you are doing.",
    {},
    async () => {
      return new Promise((resolve) => {
        const port = process.env.PORT || 3200;
        const url = `http://localhost:${port}`;
        
        let command;
        if (process.platform === 'darwin') {
          command = `open ${url}`;
        } else if (process.platform === 'win32') {
          command = `start "" "${url}"`;
        } else {
          command = `xdg-open ${url}`;
        }

        exec(command, (error) => {
          if (error) {
            resolve({
              content: [{ type: 'text', text: `Failed to open browser: ${error.message}` }],
              isError: true,
            });
          } else {
            resolve({
              content: [{ type: 'text', text: `✅ Browser opened successfully at ${url}` }],
            });
          }
        });
      });
    }
  );
}
