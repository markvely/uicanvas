// lib/ws-bridge.js — WebSocket 双向通信桥接
import { randomUUID } from 'node:crypto';

export class WSBridge {
  constructor() {
    this.clients = new Set();
    this.pendingRequests = new Map(); // requestId → { resolve, reject, timer }
    this.requestTimeout = 15000; // 15s
  }

  /** 添加新 WebSocket 连接 */
  addClient(ws) {
    this.clients.add(ws);
    ws.on('close', () => this.clients.delete(ws));
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.requestId && this.pendingRequests.has(msg.requestId)) {
          const pending = this.pendingRequests.get(msg.requestId);
          clearTimeout(pending.timer);
          this.pendingRequests.delete(msg.requestId);
          if (msg.error) {
            pending.reject(new Error(msg.error));
          } else {
            pending.resolve(msg.result);
          }
        }
      } catch { /* ignore non-JSON */ }
    });
  }

  /** 获取第一个活跃客户端 */
  get activeClient() {
    for (const ws of this.clients) {
      if (ws.readyState === 1) return ws; // OPEN
    }
    return null;
  }

  get clientCount() {
    let n = 0;
    for (const ws of this.clients) {
      if (ws.readyState === 1) n++;
    }
    return n;
  }

  /**
   * 发送命令到浏览器并等待响应
   * @param {string} type 命令类型
   * @param {object} payload 命令数据
   * @returns {Promise<any>}
   */
  sendCommand(type, payload = {}) {
    return new Promise((resolve, reject) => {
      const ws = this.activeClient;
      if (!ws) {
        return reject(new Error('No active canvas client connected'));
      }
      const requestId = randomUUID();
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request ${type} timed out after ${this.requestTimeout}ms`));
      }, this.requestTimeout);

      this.pendingRequests.set(requestId, { resolve, reject, timer });
      ws.send(JSON.stringify({ type, requestId, ...payload }));
    });
  }

  /** 广播消息到所有客户端 */
  broadcast(type, payload = {}) {
    const msg = JSON.stringify({ type, ...payload });
    for (const ws of this.clients) {
      if (ws.readyState === 1) {
        ws.send(msg);
      }
    }
  }
}
