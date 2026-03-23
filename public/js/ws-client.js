// ws-client.js — 前端 WebSocket 客户端 + 命令分发

export class WSClient {
  constructor(renderer, history = null) {
    this.renderer = renderer;
    this.history = history;
    this.ws = null;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 10000;
    this._currentDelay = this.reconnectDelay;
    this.onStatusChange = null; // callback(connected: boolean)
  }

  /** 在写操作前保存快照 */
  _saveSnapshot(targetNodeId, commandType) {
    if (!this.history) return;
    // 找到目标节点所属的画板
    const world = this.renderer.world;
    const targetEl = world.querySelector(`[data-node-id="${targetNodeId}"]`);
    if (!targetEl) return;
    // 找到最近的画板
    const artboardEl = targetEl.closest('.artboard');
    if (!artboardEl) return;
    const artboardId = artboardEl.dataset.artboardId;
    const contentEl = artboardEl.querySelector('.artboard-content');
    if (contentEl) {
      this.history.pushSnapshot(artboardId, contentEl, commandType);
    }
  }

  connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[ws] Connected');
      this._currentDelay = this.reconnectDelay;
      this.onStatusChange?.(true);
    };

    this.ws.onclose = () => {
      console.log('[ws] Disconnected, reconnecting...');
      this.onStatusChange?.(false);
      setTimeout(() => this.connect(), this._currentDelay);
      this._currentDelay = Math.min(this._currentDelay * 1.5, this.maxReconnectDelay);
    };

    this.ws.onerror = (err) => {
      console.error('[ws] Error:', err);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this._handleCommand(msg);
      } catch (err) {
        console.error('[ws] Bad message:', err);
      }
    };
  }

  /** 执行命令并返回响应 */
  async _handleCommand(msg) {
    const { type, requestId, ...params } = msg;
    if (!type) return;

    let result, error;
    try {
      result = await this._dispatch(type, params);
    } catch (err) {
      error = err.message;
    }

    // 发送响应
    if (requestId) {
      this.ws.send(JSON.stringify({
        requestId,
        result: error ? undefined : result,
        error,
      }));
    }
  }

  async _dispatch(type, params) {
    switch (type) {
      case 'get_basic_info':
        return this.renderer.getBasicInfo();

      case 'create_artboard':
        return this.renderer.create(params);

      case 'write_html':
        this._saveSnapshot(params.targetNodeId, 'write_html');
        return this.renderer.writeHTML(params);

      case 'get_children':
        return this.renderer.getChildren(params.nodeId);

      case 'get_styles': {
        const styles = this.renderer.getStyles(params.nodeIds);
        // 序列化 computed styles
        const serialized = {};
        for (const [id, cs] of Object.entries(styles)) {
          const obj = {};
          for (let i = 0; i < cs.length; i++) {
            const prop = cs[i];
            obj[prop] = cs.getPropertyValue(prop);
          }
          serialized[id] = obj;
        }
        return serialized;
      }

      case 'get_tree':
        return this.renderer.getTree(params.nodeId, params.depth);

      case 'get_node_info':
        return this.renderer.getNodeInfo(params.nodeId);

      case 'delete_nodes':
        // 保存所有受影响画板的快照
        for (const id of params.nodeIds) { this._saveSnapshot(id, 'delete_nodes'); }
        this.renderer.deleteNodes(params.nodeIds);
        return { deleted: params.nodeIds.length };

      case 'update_styles':
        // 保存受影响节点的画板快照
        for (const u of params.updates) { if (u.nodeIds[0]) this._saveSnapshot(u.nodeIds[0], 'update_styles'); }
        this.renderer.updateStyles(params.updates);
        return { updated: true };

      case 'set_text':
        for (const u of params.updates) { this._saveSnapshot(u.nodeId, 'set_text'); }
        this.renderer.setText(params.updates);
        return { updated: true };

      case 'get_screenshot':
        return await this.renderer.getScreenshot(params.nodeId, params.scale);

      case 'duplicate_nodes':
        return this.renderer.duplicateNodes(params.nodeIds);

      default:
        throw new Error(`Unknown command: ${type}`);
    }
  }
}
