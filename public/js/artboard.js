// artboard.js — 画板渲染与交互

export class ArtboardRenderer {
  constructor(world) {
    this.world = world;
    /** @type {Map<string, HTMLElement>} */
    this.artboardEls = new Map();
    this.selectedId = null;
    this._nodeIdCounter = 0;
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
   * @param {{ id: string, name: string, width: number, height: number, left: number, top: number, styles?: object }} meta
   * @returns {{ nodeId: string }}
   */
  create(meta) {
    const el = document.createElement('div');
    el.className = 'artboard';
    el.dataset.artboardId = meta.id;
    el.dataset.nodeId = meta.id; // artboard 本身也是节点
    el.style.width = `${meta.width}px`;
    el.style.height = `${meta.height}px`;
    el.style.left = `${meta.left}px`;
    el.style.top = `${meta.top}px`;

    // 应用自定义样式
    if (meta.styles) {
      for (const [k, v] of Object.entries(meta.styles)) {
        if (k !== 'width' && k !== 'height') {
          el.style[k] = v;
        }
      }
    }

    // 画板标签
    const label = document.createElement('div');
    label.className = 'artboard-label';
    label.innerHTML = `
      <span class="name">${this._escapeHtml(meta.name)}</span>
      <span class="size">${meta.width} × ${meta.height}</span>
    `;
    el.appendChild(label);

    // 内容容器
    const content = document.createElement('div');
    content.className = 'artboard-content';
    content.dataset.nodeId = `${meta.id}-content`;
    content.style.width = '100%';
    content.style.height = '100%';
    content.style.position = 'relative';
    content.style.overflow = 'hidden';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    el.appendChild(content);

    // 选中交互
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.select(meta.id);
    });

    this.world.appendChild(el);
    this.artboardEls.set(meta.id, el);

    return { nodeId: meta.id };
  }

  select(id) {
    // 取消之前选中
    if (this.selectedId) {
      const prev = this.artboardEls.get(this.selectedId);
      if (prev) prev.classList.remove('selected');
    }
    this.selectedId = id;
    const el = this.artboardEls.get(id);
    if (el) el.classList.add('selected');
  }

  deselectAll() {
    if (this.selectedId) {
      const prev = this.artboardEls.get(this.selectedId);
      if (prev) prev.classList.remove('selected');
      this.selectedId = null;
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
        if (el.classList.contains('artboard')) {
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

  /** 截图 (使用 Canvas API) */
  async getScreenshot(nodeId, scale = 1) {
    const el = this.world.querySelector(`[data-node-id="${nodeId}"]`);
    if (!el) return null;

    // 使用 html2canvas-like 方式: 直接截取节点
    const { default: htmlToImage } = await import('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/+esm');
    try {
      const dataUrl = await htmlToImage.toJpeg(el, {
        quality: 0.85,
        pixelRatio: scale,
        skipFonts: true,
      });
      return { imageData: dataUrl.split(',')[1], mimeType: 'image/jpeg' };
    } catch (err) {
      // 降级: 返回尺寸信息
      return { error: err.message, width: el.offsetWidth, height: el.offsetHeight };
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
      fileName: 'DesignCanvas',
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
