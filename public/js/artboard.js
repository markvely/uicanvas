// artboard.js — 画板渲染与交互

export class ArtboardRenderer {
  constructor(world) {
    this.world = world;
    /** @type {Map<string, HTMLElement>} */
    this.artboardEls = new Map();
    this.selectedId = null;
    this._nodeIdCounter = 0;
    /** @type {function|null} 选中状态变化回调 */
    this.onSelectionChange = null;
  }

  /** 生成唯一节点 ID */
  _genNodeId() {
    return `n-${++this._nodeIdCounter}`;
  }

  /** 为所有子元素分配 data-node-id */
  _assignNodeIds(el) {
    if (el.nodeType === 1 && !el.dataset.nodeId) {
      el.dataset.nodeId = this._genNodeId();
    }
    for (const child of el.children) {
      this._assignNodeIds(child);
    }
  }

  /**
   * 创建画板 DOM
   * @param {{ id: string, name: string, width: number, height: number, left: number, top: number, project?: string, page?: string, state?: string, styles?: object }} meta
   * @returns {{ nodeId: string }}
   */
  create(meta) {
    // ── 外层包装器 (不裁剪, 放标签和拖拽手柄) ──
    const wrapper = document.createElement('div');
    wrapper.className = 'artboard-wrapper';
    wrapper.dataset.artboardId = meta.id;
    wrapper.dataset.nodeId = meta.id;
    wrapper._meta = { ...meta };

    wrapper.style.position = 'absolute';
    wrapper.style.left = `${meta.left}px`;
    wrapper.style.top = `${meta.top}px`;
    wrapper.style.width = `${meta.width}px`;

    // ── 标签 (在画板外部上方) ──
    const titleParts = [];
    if (meta.project) titleParts.push(meta.project);
    if (meta.page) titleParts.push(meta.page);
    if (meta.state) titleParts.push(meta.state);
    const displayName = titleParts.length > 0
      ? titleParts.map((p, i) => `<span class="label-part">${this._escapeHtml(p)}</span>${i < titleParts.length - 1 ? '<span class="label-sep">/</span>' : ''}`).join('')
      : `<span class="label-part">${this._escapeHtml(meta.name)}</span>`;

    const label = document.createElement('div');
    label.className = 'artboard-label';
    label.innerHTML = `
      <span class="name">${displayName}</span>
      <span class="size">${meta.width} × ${meta.height}</span>
    `;
    wrapper.appendChild(label);

    // ── 画板主体 (可视区域, overflow: hidden) ──
    const body = document.createElement('div');
    body.className = 'artboard';
    body.style.width = '100%';
    body.style.height = `${meta.height}px`;
    body.style.minHeight = `${meta.height}px`;

    // 应用自定义样式到 body
    if (meta.styles) {
      for (const [k, v] of Object.entries(meta.styles)) {
        if (k !== 'width' && k !== 'height') {
          body.style[k] = v;
        }
      }
    }
    wrapper.appendChild(body);

    // ── 内容容器 (undo/redo 快照的目标) ──
    const content = document.createElement('div');
    content.className = 'artboard-content';
    content.dataset.nodeId = `${meta.id}-content`;
    content.style.width = '100%';
    content.style.height = '100%';
    content.style.position = 'relative';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    body.appendChild(content);

    // ── 拖拽调整高度手柄 ──
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'artboard-resize-handle';
    wrapper.appendChild(resizeHandle);

    const sizeLabel = label.querySelector('.size');
    let startY = 0, startH = 0;
    resizeHandle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      startY = e.clientY;
      startH = body.offsetHeight;
      resizeHandle.setPointerCapture(e.pointerId);

      const onMove = (ev) => {
        const canvas = this.world.closest('#canvas-viewport');
        const scale = canvas ? parseFloat(getComputedStyle(this.world).transform.split(',')[3]) || 1 : 1;
        const delta = (ev.clientY - startY) / scale;
        const newH = Math.max(100, startH + delta);
        body.style.height = `${newH}px`;
        body.style.minHeight = `${newH}px`;
        if (sizeLabel) sizeLabel.textContent = `${meta.width} × ${Math.round(newH)}`;
      };
      const onUp = () => {
        resizeHandle.removeEventListener('pointermove', onMove);
        resizeHandle.removeEventListener('pointerup', onUp);
      };
      resizeHandle.addEventListener('pointermove', onMove);
      resizeHandle.addEventListener('pointerup', onUp);
    });

    // ── 选中交互 ──
    wrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      this.select(meta.id);
    });

    this.world.appendChild(wrapper);
    this.artboardEls.set(meta.id, wrapper);

    return { nodeId: meta.id };
  }

  /** 获取画板的结构化文件名 */
  getArtboardFileName(artboardId) {
    const el = this.artboardEls.get(artboardId);
    if (!el || !el._meta) return 'artboard';
    const m = el._meta;
    const parts = [m.project, m.page, m.state].filter(Boolean);
    const name = parts.length > 0 ? parts.join('-') : (m.name || 'artboard');
    return `${name}_${m.width}x${m.height}`;
  }

  select(id) {
    if (this.selectedId) {
      const prev = this.artboardEls.get(this.selectedId);
      if (prev) prev.classList.remove('selected');
    }
    this.selectedId = id;
    const el = this.artboardEls.get(id);
    if (el) el.classList.add('selected');
    this.onSelectionChange?.(id);
  }

  deselectAll() {
    if (this.selectedId) {
      const prev = this.artboardEls.get(this.selectedId);
      if (prev) prev.classList.remove('selected');
      this.selectedId = null;
      this.onSelectionChange?.(null);
    }
  }

  /**
   * 向画板写入 HTML
   * @param {{ targetNodeId: string, html: string, mode: string }} params
   * @returns {{ createdNodes: Array }}
   */
  writeHTML({ targetNodeId, html, mode }) {
    const target = this.world.querySelector(`[data-node-id="${targetNodeId}"]`);
    if (!target) throw new Error(`Node not found: ${targetNodeId}`);

    const temp = document.createElement('div');
    temp.innerHTML = html;

    const createdNodes = [];

    if (mode === 'replace') {
      const parent = target.parentElement;
      while (temp.firstChild) {
        const child = temp.firstChild;
        if (child.nodeType === 1) {
          this._assignNodeIds(child);
          createdNodes.push({
            nodeId: child.dataset.nodeId,
            name: child.getAttribute('layer-name') || child.tagName.toLowerCase(),
            componentType: child.tagName.toLowerCase(),
          });
        }
        parent.insertBefore(child, target);
      }
      target.remove();
    } else {
      // insert-children
      while (temp.firstChild) {
        const child = temp.firstChild;
        if (child.nodeType === 1) {
          this._assignNodeIds(child);
          createdNodes.push({
            nodeId: child.dataset.nodeId,
            name: child.getAttribute('layer-name') || child.tagName.toLowerCase(),
            componentType: child.tagName.toLowerCase(),
          });
        }
        target.appendChild(child);
      }
    }

    return { createdNodes };
  }

  /** 获取节点信息 */
  getNodeInfo(nodeId) {
    const el = this.world.querySelector(`[data-node-id="${nodeId}"]`);
    if (!el) return null;

    const rect = el.getBoundingClientRect();
    const children = [...el.children]
      .filter(c => c.dataset.nodeId)
      .map(c => c.dataset.nodeId);

    return {
      nodeId,
      name: el.getAttribute('layer-name') || el.tagName.toLowerCase(),
      componentType: el.tagName.toLowerCase(),
      width: el.offsetWidth,
      height: el.offsetHeight,
      childrenIds: children,
      textContent: el.children.length === 0 ? el.textContent : undefined,
      isArtboard: el.classList.contains('artboard'),
    };
  }

  /** 获取子节点 */
  getChildren(nodeId) {
    const el = this.world.querySelector(`[data-node-id="${nodeId}"]`);
    if (!el) return null;

    return [...el.children]
      .filter(c => c.dataset.nodeId && !c.classList.contains('artboard-label'))
      .map(c => ({
        nodeId: c.dataset.nodeId,
        name: c.getAttribute('layer-name') || c.tagName.toLowerCase(),
        componentType: c.tagName.toLowerCase(),
        childCount: c.querySelectorAll('[data-node-id]').length,
      }));
  }

  /** 获取节点样式 */
  getStyles(nodeIds) {
    const result = {};
    for (const id of nodeIds) {
      const el = this.world.querySelector(`[data-node-id="${id}"]`);
      if (el) {
        result[id] = window.getComputedStyle(el);
      }
    }
    return result;
  }

  /** 更新节点样式 */
  updateStyles(updates) {
    for (const { nodeIds, styles } of updates) {
      for (const id of nodeIds) {
        const el = this.world.querySelector(`[data-node-id="${id}"]`);
        if (el) {
          for (const [k, v] of Object.entries(styles)) {
            el.style[k] = v;
          }
        }
      }
    }
  }

  /** 设置文字内容 */
  setText(updates) {
    for (const { nodeId, textContent } of updates) {
      const el = this.world.querySelector(`[data-node-id="${nodeId}"]`);
      if (el) el.textContent = textContent;
    }
  }

  /** 删除节点 */
  deleteNodes(nodeIds) {
    for (const id of nodeIds) {
      const el = this.world.querySelector(`[data-node-id="${id}"]`);
      if (el) {
        if (el.dataset.artboardId) {
          this.artboardEls.delete(el.dataset.artboardId);
        }
        el.remove();
      }
    }
  }

  /** 获取节点树摘要 */
  getTree(nodeId, depth = 3) {
    const el = this.world.querySelector(`[data-node-id="${nodeId}"]`);
    if (!el) return null;

    const walk = (node, d, indent) => {
      if (d > depth || !node.dataset?.nodeId) return '';
      const name = node.getAttribute('layer-name') || node.tagName.toLowerCase();
      const w = node.offsetWidth;
      const h = node.offsetHeight;
      const childNodes = [...node.children].filter(c => c.dataset.nodeId && !c.classList.contains('artboard-label'));
      let line = `${indent}${name} [${node.dataset.nodeId}] ${w}×${h}`;
      if (d === depth && childNodes.length > 0) {
        line += ` (${childNodes.length} children)`;
      }
      let result = line + '\n';
      if (d < depth) {
        for (const c of childNodes) {
          result += walk(c, d + 1, indent + '  ');
        }
      }
      return result;
    };

    return walk(el, 0, '');
  }

  /** 复制节点 */
  duplicateNodes(nodeIds) {
    const results = [];
    for (const id of nodeIds) {
      const el = this.world.querySelector(`[data-node-id="${id}"]`);
      if (!el) continue;
      const clone = el.cloneNode(true);
      // 重新分配所有节点 ID
      clone.dataset.nodeId = this._genNodeId();
      this._reassignNodeIds(clone);
      el.parentElement.appendChild(clone);
      results.push({ sourceId: id, newId: clone.dataset.nodeId });
    }
    return results;
  }

  _reassignNodeIds(el) {
    for (const child of el.querySelectorAll('[data-node-id]')) {
      child.dataset.nodeId = this._genNodeId();
    }
  }

  /** 截图 (SVG foreignObject, 无 CDN 依赖) */
  async getScreenshot(nodeId, scale = 1) {
    const el = this.world.querySelector(`[data-node-id="${nodeId}"]`);
    if (!el) return null;

    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (w === 0 || h === 0) return { error: 'Element has zero dimensions', width: w, height: h };

    try {
      const clone = el.cloneNode(true);
      this._inlineAllStyles(el, clone);

      const svgNS = 'http://www.w3.org/2000/svg';
      const fo = `<foreignObject width="${w}" height="${h}">${new XMLSerializer().serializeToString(clone)}</foreignObject>`;
      const svg = `<svg xmlns="${svgNS}" width="${w}" height="${h}">${fo}</svg>`;
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const dataUrl = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = w * scale;
          canvas.height = h * scale;
          const ctx = canvas.getContext('2d');
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG render failed')); };
        img.src = url;
      });

      return { imageData: dataUrl.split(',')[1], mimeType: 'image/jpeg' };
    } catch (err) {
      return { error: err.message, width: w, height: h };
    }
  }

  /** 内联所有计算样式到克隆节点 */
  _inlineAllStyles(source, target) {
    if (source.nodeType !== 1) return;
    target.style.cssText = window.getComputedStyle(source).cssText;
    const src = source.children, tgt = target.children;
    for (let i = 0; i < src.length && i < tgt.length; i++) {
      this._inlineAllStyles(src[i], tgt[i]);
    }
  }

  /** 获取基本信息 */
  getBasicInfo() {
    const allNodes = this.world.querySelectorAll('[data-node-id]');
    const artboardList = [];
    for (const [id, el] of this.artboardEls) {
      artboardList.push({
        id,
        name: el.querySelector('.artboard-label .name')?.textContent || '',
        width: el.offsetWidth,
        height: el.offsetHeight,
        left: parseFloat(el.style.left) || 0,
        top: parseFloat(el.style.top) || 0,
        childCount: el.querySelectorAll('.artboard-content > [data-node-id]').length,
      });
    }
    return {
      fileName: 'UICanvas',
      nodeCount: allNodes.length,
      artboardCount: this.artboardEls.size,
      artboards: artboardList,
    };
  }

  _escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }
}
