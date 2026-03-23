// history.js — AI 操作历史管理 (Undo/Redo)

export class HistoryManager {
  constructor(maxSteps = 50) {
    this.maxSteps = maxSteps;
    /** @type {Array<{artboardId: string, snapshot: string, commandType: string}>} */
    this.undoStack = [];
    /** @type {Array<{artboardId: string, snapshot: string, commandType: string}>} */
    this.redoStack = [];
    this.onChangeCallbacks = [];
  }

  /** 注册状态变化回调 */
  onChange(cb) {
    this.onChangeCallbacks.push(cb);
  }

  _notify() {
    for (const cb of this.onChangeCallbacks) cb(this);
  }

  /**
   * 在 AI 操作前保存快照
   * @param {string} artboardId 受影响的画板 ID
   * @param {HTMLElement} contentEl 画板内容元素
   * @param {string} commandType 操作类型 (write_html, update_styles, etc.)
   */
  pushSnapshot(artboardId, contentEl, commandType) {
    if (!contentEl) return;
    this.undoStack.push({
      artboardId,
      snapshot: contentEl.innerHTML,
      commandType,
    });
    // 新操作清空 redo
    this.redoStack = [];
    // 限制历史长度
    if (this.undoStack.length > this.maxSteps) {
      this.undoStack.shift();
    }
    this._notify();
  }

  /**
   * 撤销上一步 AI 操作
   * @param {function} getContentEl (artboardId) => HTMLElement
   * @returns {boolean} 是否成功
   */
  undo(getContentEl) {
    if (this.undoStack.length === 0) return false;
    const entry = this.undoStack.pop();
    const contentEl = getContentEl(entry.artboardId);
    if (!contentEl) return false;

    // 保存当前状态到 redo
    this.redoStack.push({
      artboardId: entry.artboardId,
      snapshot: contentEl.innerHTML,
      commandType: entry.commandType,
    });

    // 恢复快照
    contentEl.innerHTML = entry.snapshot;
    this._notify();
    return true;
  }

  /**
   * 重做上一步撤销
   * @param {function} getContentEl (artboardId) => HTMLElement
   * @returns {boolean} 是否成功
   */
  redo(getContentEl) {
    if (this.redoStack.length === 0) return false;
    const entry = this.redoStack.pop();
    const contentEl = getContentEl(entry.artboardId);
    if (!contentEl) return false;

    // 保存当前状态到 undo
    this.undoStack.push({
      artboardId: entry.artboardId,
      snapshot: contentEl.innerHTML,
      commandType: entry.commandType,
    });

    // 恢复快照
    contentEl.innerHTML = entry.snapshot;
    this._notify();
    return true;
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }

  /** 获取上一步操作描述 */
  get lastUndoLabel() {
    if (this.undoStack.length === 0) return '';
    return this.undoStack[this.undoStack.length - 1].commandType;
  }

  get lastRedoLabel() {
    if (this.redoStack.length === 0) return '';
    return this.redoStack[this.redoStack.length - 1].commandType;
  }
}
