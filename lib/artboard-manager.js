// lib/artboard-manager.js — 画板状态管理
import { randomUUID } from 'node:crypto';

const GAP = 80; // 画板间距

export class ArtboardManager {
  constructor() {
    /** @type {Map<string, ArtboardMeta>} */
    this.artboards = new Map();
  }

  /** 计算下一个画板的 left 位置 */
  nextLeft() {
    let maxRight = 0;
    for (const ab of this.artboards.values()) {
      const right = ab.left + ab.width;
      if (right > maxRight) maxRight = right;
    }
    return maxRight === 0 ? 0 : maxRight + GAP;
  }

  /**
   * 创建画板
   * @param {{ name: string, width: number, height: number, project?: string, page?: string, state?: string, styles?: object }} opts
   * @returns {ArtboardMeta}
   */
  create({ name, width, height, project, page, state, styles = {} }) {
    const id = `ab-${randomUUID().slice(0, 8)}`;
    const left = this.nextLeft();
    const meta = { id, name, width, height, left, top: 0, project, page, state, styles };
    this.artboards.set(id, meta);
    return meta;
  }

  get(id) { return this.artboards.get(id) || null; }

  delete(id) { return this.artboards.delete(id); }

  list() { return [...this.artboards.values()]; }

  /** 重新排布所有画板 */
  relayout() {
    let left = 0;
    for (const ab of this.artboards.values()) {
      ab.left = left;
      left += ab.width + GAP;
    }
  }

  toJSON() {
    return this.list().map(ab => ({
      id: ab.id,
      name: ab.name,
      width: ab.width,
      height: ab.height,
      left: ab.left,
      top: ab.top,
    }));
  }
}
