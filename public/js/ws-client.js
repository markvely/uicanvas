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
    const world = this.renderer.world;
    const targetEl = world.querySelector(`[data-node-id="${targetNodeId}"]`);
    if (!targetEl) return;
    // 找到最近的画板包装器
    const wrapper = targetEl.closest('[data-artboard-id]');
    if (!wrapper) return;
    const artboardId = wrapper.dataset.artboardId;
    const contentEl = wrapper.querySelector('.artboard-content');
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
      case '__open_canvas__':
        return { connected: true, timestamp: Date.now() };

      case '__request_save__': {
        // 前端序列化并发回给 server
        const saveData = this.renderer.serialize();
        this.ws.send(JSON.stringify({ type: '__save_data__', data: saveData }));
        return { saved: true };
      }

      case 'load_canvas': {
        const data = params.data || params;
        this.renderer.loadFromData(data);
        return { loaded: true, artboardCount: data.artboards?.length || 0 };
      }

      case 'get_basic_info':
        return this.renderer.getBasicInfo();

      case 'create_artboard': {
        const result = this.renderer.create(params);
        this._notifyDirty();
        return result;
      }

      case 'write_html':
        this._saveSnapshot(params.targetNodeId, 'write_html');
        this._notifyDirty();
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
        for (const id of params.nodeIds) { this._saveSnapshot(id, 'delete_nodes'); }
        this.renderer.deleteNodes(params.nodeIds);
        this._notifyDirty();
        return { deleted: params.nodeIds.length };

      case 'update_styles':
        for (const u of params.updates) { if (u.nodeIds[0]) this._saveSnapshot(u.nodeIds[0], 'update_styles'); }
        this.renderer.updateStyles(params.updates);
        this._notifyDirty();
        return { updated: true };

      case 'set_text':
        for (const u of params.updates) { this._saveSnapshot(u.nodeId, 'set_text'); }
        this.renderer.setText(params.updates);
        this._notifyDirty();
        return { updated: true };

      case 'get_screenshot':
        return await this.renderer.getScreenshot(params.nodeId, params.scale);

      case 'duplicate_nodes': {
        const duped = this.renderer.duplicateNodes(params.nodeIds);
        this._notifyDirty();
        return duped;
      }

      default:
        throw new Error(`Unknown command: ${type}`);
    }
  }

  /** 通知 dirty 状态变化并触发自动保存 */
  _notifyDirty() {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify({ type: '__dirty__' }));
    }
    this._triggerAutoSave();
  }

  /** 触发自动保存（延迟 2 秒去抖） */
  _triggerAutoSave() {
    clearTimeout(this._autoSaveTimer);
    this._autoSaveTimer = setTimeout(() => {
      const saveData = this.renderer.serialize();
      if (this.ws && this.ws.readyState === 1) {
        this.ws.send(JSON.stringify({ type: '__save_data__', data: saveData }));
      }
    }, 2000);
  }
}
