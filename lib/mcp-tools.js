// lib/mcp-tools.js — MCP 工具注册 (McpServer 高层 API)
import { z } from 'zod';
import { generateSpecTemplate, DEFAULT_TOKENS } from '../components/design-spec-template.js';

/**
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {import('./ws-bridge.js').WSBridge} bridge
 * @param {import('./artboard-manager.js').ArtboardManager} artboards
 * @param {import('./project-manager.js').ProjectManager} project
 */
export function registerTools(server, bridge, artboards, project) {

  /**
   * Sanitize a filename: remove special chars, replace spaces with underscores
   */
  function sanitizeFileName(name) {
    return name
      .replace(/[<>:"\/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '')
      || 'Untitled';
  }

  /**
   * 发送命令到 Webview 并等待真正执行结果
   * 如果连接断开 (DISCONNECTED)，自动尝试重连后重试一次
   */
  async function sendVisualCommand(type, payload = {}) {
    try {
      return await bridge.sendCommand(type, payload);
    } catch (err) {
      if (err.code === 'DISCONNECTED') {
        // 尝试触发面板重新打开并等待连接恢复
        const maxWait = 15000;
        const start = Date.now();
        // 发送打开面板信号（如果有远程连接的话）
        try { await bridge.sendCommand('__trigger_open_panel__'); } catch { /* ignore */ }
        // 轮询等待连接恢复
        while (Date.now() - start < maxWait) {
          await new Promise(r => setTimeout(r, 500));
          const hasConn = bridge.hasActiveWebviewClient ||
            (bridge.remoteWs && bridge.remoteWs.readyState === 1);
          if (hasConn) {
            try {
              return await bridge.sendCommand(type, payload);
            } catch { /* continue waiting */ }
          }
        }
        throw new Error(`Canvas disconnected and reconnection failed after ${maxWait}ms. Please Reload Window.`);
      }
      throw err;
    }
  }

  // ── 画板面板控制 ────────────────────────────────────────

  server.tool('open_canvas',
    `Open the UICanvas preview panel in the editor. ⚠️ IMPORTANT: You MUST call this tool FIRST before calling any other UICanvas tool (init_project, create_artboard, write_html, etc.). The canvas panel must be open and connected for visual commands to work.`,
    {},
    async () => {
      const maxWaitMs = 30000; // 总超时 30 秒
      const pollInterval = 500; // 轮询间隔 500ms
      const startTime = Date.now();

      // ── Phase 1: 等待 WS 桥接连接到 HTTP Server ──────────────
      while (Date.now() - startTime < maxWaitMs) {
        // 本地客户端（HTTP Server 模式）或远程 WS（stdio 模式）
        const hasConnection = bridge.hasActiveWebviewClient ||
          (bridge.remoteWs && bridge.remoteWs.readyState === 1);
        if (hasConnection) break;
        await new Promise(r => setTimeout(r, pollInterval));
      }

      if (Date.now() - startTime >= maxWaitMs) {
        return {
          content: [{ type: 'text', text: JSON.stringify({
            success: false,
            error: 'WS bridge connection timeout',
            message: '❌ Could not connect to UICanvas HTTP server. Please try Reload Window (Cmd+Shift+P → Developer: Reload Window).',
          }, null, 2) }],
          isError: true,
        };
      }

      // ── Phase 2: 触发面板打开（立即响应，不等 Webview）──────────
      try {
        await bridge.sendCommand('__trigger_open_panel__');
      } catch {
        // 触发失败也继续——面板可能已经打开了
      }

      // ── Phase 3: 轮询 Webview 连接状态 ─────────────────────────
      while (Date.now() - startTime < maxWaitMs) {
        try {
          const status = await bridge.sendCommand('__check_webview_status__');
          if (status?.ready) {
            return {
              content: [{ type: 'text', text: JSON.stringify({
                success: true,
                connected: true,
                webviewCount: status.webviewCount,
                elapsed: Date.now() - startTime,
                message: '✅ Canvas panel is open and connected. You can now use all UICanvas tools.',
              }, null, 2) }],
            };
          }
        } catch {
          // WS 暂时不可用，继续重试
        }
        await new Promise(r => setTimeout(r, pollInterval));
      }

      // 所有重试都失败了
      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: false,
          error: 'Webview connection timeout',
          message: '❌ Canvas panel did not connect within 30 seconds. Please try Reload Window (Cmd+Shift+P → Developer: Reload Window).',
        }, null, 2) }],
        isError: true,
      };
    }
  );

  // ── 工作流工具 ──────────────────────────────────────────

  server.tool('init_project',
    `Initialize a new project. This MUST be called before creating any artboards.
⚠️ PREREQUISITE: Call open_canvas first to ensure the canvas panel is open.
UICanvas enforces a design-spec-first workflow:
1. Call open_canvas → opens the canvas panel
2. Call init_project → creates a Design Spec artboard automatically
3. Review/customize the spec (colors, fonts, spacing)
4. Call finalize_design_spec → unlocks page artboard creation
5. Now call create_artboard freely for your UI pages`,
    {
      projectName: z.string().describe('Project name, e.g. "MyApp"'),
      fileName: z.string().optional().describe('File name for the .uicanvas file (without extension). Should be descriptive and based on the project/design purpose. E.g. "MyApp_Login" or "Dashboard_Settings". If omitted, derived from projectName.'),
      designTokens: z.object({
        colors: z.record(z.string()).optional().describe('Override default colors, e.g. { primary: "#FF6B6B" }'),
        fonts: z.record(z.string()).optional().describe('Override default fonts, e.g. { heading: "Inter, sans-serif" }'),
      }).optional().describe('Optional custom design tokens to override defaults'),
    },
    async ({ projectName, fileName, designTokens }) => {
      // 初始化项目状态
      project.initProject(projectName);

      // 通知 extension 绑定 .uicanvas 文件
      const resolvedFileName = sanitizeFileName(fileName || projectName);
      try {
        bridge.broadcast('__bind_file__', { fileName: resolvedFileName });
      } catch { /* ignore if no clients */ }

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

      // 渲染画板（异步，不阻塞 MCP 响应）
      await sendVisualCommand('create_artboard', specMeta);

      // 填充设计规范模板
      const specHtml = generateSpecTemplate(projectName, designTokens || {});
      await sendVisualCommand('write_html', {
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
            fileName: resolvedFileName,
            specArtboardId: specMeta.id,
            state: 'spec_in_progress',
            message: `✅ Project "${projectName}" initialized. Design Spec artboard created. File: ${resolvedFileName}.uicanvas\n\nNext steps:\n1. Review the generated design spec on the canvas\n2. Customize colors/fonts/spacing if needed using write_html or update_styles\n3. When satisfied, call finalize_design_spec to unlock page design`,
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

  // ── 基本信息 (纯服务端，不需要 Webview) ───────────────────

  server.tool('get_basic_info',
    'Get canvas info: artboard list, node count, and project workflow state.',
    {},
    async () => {
      // 直接从服务端状态返回，不需要 Webview
      const artboardList = artboards.list().map(ab => ({
        id: ab.id,
        name: ab.name,
        width: ab.width,
        height: ab.height,
        left: ab.left,
        top: ab.top,
      }));
      const result = {
        fileName: 'UICanvas',
        nodeCount: artboardList.length,
        artboardCount: artboardList.length,
        artboards: artboardList,
        project: project.toJSON(),
      };
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 画板创建 (受工作流约束) ──────────────────────────────

  server.tool('create_artboard',
    `Create a new artboard on the canvas. Use project/page/state for structured naming.
⚠️ PREREQUISITE: Call open_canvas first to ensure the canvas panel is open.
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
      const result = await sendVisualCommand('create_artboard', meta);

      const response = { ...meta, ...result, nodeId: `${meta.id}-content` };
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
      const result = await sendVisualCommand('write_html', params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool('get_children',
    'Get direct children of a node.',
    { nodeId: z.string() },
    async ({ nodeId }) => {
      const result = await sendVisualCommand('get_children', { nodeId });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool('get_styles',
    'Get computed styles for one or more nodes.',
    { nodeIds: z.array(z.string()) },
    async ({ nodeIds }) => {
      const result = await sendVisualCommand('get_styles', { nodeIds });
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
      const result = await sendVisualCommand('get_tree', params);
      return { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool('get_node_info',
    'Get detailed info about a specific node.',
    { nodeId: z.string() },
    async ({ nodeId }) => {
      const result = await sendVisualCommand('get_node_info', { nodeId });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool('delete_nodes',
    'Delete one or more nodes.',
    { nodeIds: z.array(z.string()) },
    async ({ nodeIds }) => {
      const result = await sendVisualCommand('delete_nodes', { nodeIds });
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
      const result = await sendVisualCommand('update_styles', { updates });
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
      const result = await sendVisualCommand('set_text', { updates });
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
      const result = await sendVisualCommand('get_screenshot', params);
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
      const result = await sendVisualCommand('duplicate_nodes', { nodeIds });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── 图片插入 ───────────────────────────────────────
  server.tool('insert_image',
    `Insert an image into a target node. The image can be a URL or base64 data URI. Returns the created node ID.

⚠️ IMAGE SOURCE GUIDELINES (IMPORTANT - read carefully):
1. **Base64 data URI (MOST RELIABLE)**: Use "data:image/png;base64,..." or "data:image/jpeg;base64,...". 
   - This is the PREFERRED method because it embeds image data directly, avoiding all network/CORS issues.
   - To use this: first generate or obtain the image, then encode it to base64.
   - If you have a generate_image tool, generate the image first, read the file, and convert to base64 data URI.
2. **Local server URL**: Use "http://localhost:{port}/media/filename.png" if the image is placed in the UICanvas public/media/ directory.
3. **External URLs**: Use any publicly accessible image URL (e.g. https://picsum.photos/400/300 for placeholder images).
   - ⚠️ External URLs may fail in screenshot captures due to CORS restrictions.
   - If you only need a visual placeholder, consider using a colored div with CSS gradients instead.

💡 TIP: For background images, prefer using CSS background-image via update_styles or write_html with inline styles rather than insert_image. Example: style="background: linear-gradient(135deg, #667eea, #764ba2);"`,
    {
      targetNodeId: z.string().describe('Target container node ID to insert the image into'),
      src: z.string().describe('Image source. Preferred: base64 data URI (data:image/png;base64,...). Also accepts: http URLs or localhost URLs.'),
      alt: z.string().optional().describe('Alt text for the image'),
      width: z.string().optional().describe('CSS width, e.g. "100%" or "200px"'),
      height: z.string().optional().describe('CSS height, e.g. "auto" or "300px"'),
      objectFit: z.enum(['cover', 'contain', 'fill', 'none']).optional().default('cover').describe('Object-fit mode'),
    },
    async ({ targetNodeId, src, alt, width, height, objectFit }) => {
      const imgHtml = `<img src="${src}" alt="${alt || ''}" style="width:${width || '100%'}; height:${height || 'auto'}; object-fit:${objectFit || 'cover'}; display:block; border-radius:inherit;" />`;
      const result = await sendVisualCommand('write_html', {
        targetNodeId,
        html: imgHtml,
        mode: 'insert-children',
      });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );
}
