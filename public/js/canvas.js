// canvas.js — 无限画布核心 (zoom / pan / grid)

export class Canvas {
  constructor(viewport, world) {
    this.viewport = viewport;
    this.world = world;

    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.minScale = 0.1;
    this.maxScale = 8;

    // 平移状态
    this._isPanning = false;
    this._spaceDown = false;
    this._startX = 0;
    this._startY = 0;

    this._bindEvents();
    this._updateTransform();
  }

  _bindEvents() {
    // ── 缩放: ⌘+滚轮 / Ctrl+滚轮 ──
    this.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = this.viewport.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const delta = -e.deltaY * 0.002;
        this.zoomAt(mx, my, delta);
      } else {
        // 普通滚轮 → 平移
        this.offsetX -= e.deltaX;
        this.offsetY -= e.deltaY;
        this._updateTransform();
      }
    }, { passive: false });

    // ── 空格+拖拽平移 ──
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat) {
        this._spaceDown = true;
        this.viewport.classList.add('panning');
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this._spaceDown = false;
        this._isPanning = false;
        this.viewport.classList.remove('panning', 'active');
      }
    });

    this.viewport.addEventListener('pointerdown', (e) => {
      // 中键拖拽 或 空格+左键拖拽
      if (e.button === 1 || (this._spaceDown && e.button === 0)) {
        this._isPanning = true;
        this._startX = e.clientX - this.offsetX;
        this._startY = e.clientY - this.offsetY;
        this.viewport.classList.add('active');
        this.viewport.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    });

    this.viewport.addEventListener('pointermove', (e) => {
      if (!this._isPanning) return;
      this.offsetX = e.clientX - this._startX;
      this.offsetY = e.clientY - this._startY;
      this._updateTransform();
    });

    this.viewport.addEventListener('pointerup', (e) => {
      if (this._isPanning) {
        this._isPanning = false;
        this.viewport.classList.remove('active');
      }
    });

    // ── 快捷键 ──
    document.addEventListener('keydown', (e) => {
      // ⌘+0 重置缩放
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        this.resetView();
      }
      // ⌘+1 适应屏幕
      if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        this.fitToScreen();
      }
    });
  }

  zoomAt(mx, my, delta) {
    const prevScale = this.scale;
    this.scale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * (1 + delta)));

    // 以鼠标位置为缩放中心
    const ratio = this.scale / prevScale;
    this.offsetX = mx - ratio * (mx - this.offsetX);
    this.offsetY = my - ratio * (my - this.offsetY);

    this._updateTransform();
  }

  resetView() {
    this.scale = 1;
    this.offsetX = this.viewport.clientWidth / 2;
    this.offsetY = this.viewport.clientHeight / 2;
    this._updateTransform();
  }

  fitToScreen() {
    const artboards = this.world.querySelectorAll('.artboard');
    if (!artboards.length) return this.resetView();

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    artboards.forEach(ab => {
      const l = parseFloat(ab.style.left) || 0;
      const t = parseFloat(ab.style.top) || 0;
      const w = ab.offsetWidth;
      const h = ab.offsetHeight;
      if (l < minX) minX = l;
      if (t < minY) minY = t;
      if (l + w > maxX) maxX = l + w;
      if (t + h > maxY) maxY = t + h;
    });

    const padding = 80;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    const vw = this.viewport.clientWidth;
    const vh = this.viewport.clientHeight;

    this.scale = Math.min(vw / contentW, vh / contentH, 2);
    this.offsetX = (vw - contentW * this.scale) / 2 - minX * this.scale + padding * this.scale;
    this.offsetY = (vh - contentH * this.scale) / 2 - minY * this.scale + padding * this.scale;
    this._updateTransform();
  }

  _updateTransform() {
    this.world.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;

    // 更新网格背景
    const gridSize = 20 * this.scale;
    this.viewport.style.backgroundSize = `${gridSize}px ${gridSize}px`;
    this.viewport.style.backgroundPosition = `${this.offsetX}px ${this.offsetY}px`;

    // 缩放指示器
    const zoomEl = document.getElementById('zoom-level');
    if (zoomEl) zoomEl.textContent = `${Math.round(this.scale * 100)}%`;

    this.viewport.dispatchEvent(new CustomEvent('canvas-transform', {
      detail: { scale: this.scale, offsetX: this.offsetX, offsetY: this.offsetY }
    }));
  }

  /** 屏幕坐标 → 画布坐标 */
  screenToCanvas(sx, sy) {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale,
    };
  }

  /** 画布坐标 → 屏幕坐标 */
  canvasToScreen(cx, cy) {
    return {
      x: cx * this.scale + this.offsetX,
      y: cy * this.scale + this.offsetY,
    };
  }
}
