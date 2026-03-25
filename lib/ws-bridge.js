// lib/ws-bridge.js — WebSocket 双向通信桥接（支持远程转发）
import { randomUUID } from 'node:crypto';

export class WSBridge {
  constructor() {
    this.clients = new Set();
    this.remoteWs = null; // 远程 WS 连接（stdio 进程 → HTTP 服务器）
    this.pendingRequests = new Map(); // requestId → { resolve, reject, timer }
    this.requestTimeout = 15000; // 15s
    this._commandQueue = []; // 队列：当没有 Webview 客户端时暂存命令
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

    // 🔄 新客户端连接时自动重放队列中的命令
    if (this._commandQueue.length > 0 && !ws.isRemoteStdio) {
      setTimeout(() => this._replayQueue(), 500);
    }
  }

  /** 将命令加入队列（Webview 不可用时使用） */
  enqueueCommand(type, payload = {}) {
    this._commandQueue.push({ type, payload });
  }

  /** 重放队列中的命令到第一个可用的 Webview 客户端 */
  async _replayQueue() {
    while (this._commandQueue.length > 0) {
      const { type, payload } = this._commandQueue.shift();
      try {
        await this.sendCommand(type, payload);
      } catch {
        // 仍然失败则放回队列头部，等下次客户端连接
        this._commandQueue.unshift({ type, payload });
        break;
      }
    }
  }

  /**
   * 设置远程 WS 连接（用于 stdio 进程转发命令到 HTTP 服务器）
   * @param {WebSocket} ws 连接到 ws://localhost:3200 的客户端
   */
  setRemote(ws) {
    this.remoteWs = ws;
    // 监听远程响应，用于 sendCommand 的请求/响应模式
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
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
      } catch { /* ignore */ }
    });
  }

  /** 获取第一个活跃客户端 */
  get activeClient() {
    for (const ws of this.clients) {
      if (ws.readyState === 1) return ws; // OPEN
    }
    return null;
  }

  /** 检查是否有真正的 Webview 客户端（排除 stdio 桥接） */
  get hasActiveWebviewClient() {
    for (const ws of this.clients) {
      if (ws.readyState === 1 && !ws.isRemoteStdio) return true;
    }
    return false;
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
   * 优先使用本地客户端，没有则通过远程 WS 转发
   */
  sendCommand(type, payload = {}) {
    return new Promise((resolve, reject) => {
      // 优先本地客户端
      let ws = this.activeClient;
      // 没有本地客户端时，走远程转发
      if (!ws && this.remoteWs && this.remoteWs.readyState === 1) {
        ws = this.remoteWs;
      }
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
    // 也转发到远程
    if (this.remoteWs && this.remoteWs.readyState === 1) {
      this.remoteWs.send(msg);
    }
  }
}
