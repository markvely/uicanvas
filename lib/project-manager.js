// lib/project-manager.js — 项目状态管理 (设计规范优先工作流)

/**
 * 项目状态:
 *   idle             → 未初始化，需要调用 init_project
 *   spec_in_progress → 设计规范制作中，只允许在 spec 画板上操作
 *   ready            → 规范完成，可以自由创建页面画板
 */
export class ProjectManager {
  constructor() {
    this.state = 'idle'; // 'idle' | 'spec_in_progress' | 'ready'
    this.projectName = '';
    this.specArtboardId = null;
    this.designTokens = null;
  }

  /**
   * 初始化项目
   * @param {string} name 项目名
   * @returns {{ specArtboardId: string }} 规范画板信息
   */
  initProject(name) {
    this.projectName = name;
    this.state = 'spec_in_progress';
    return { projectName: this.projectName, state: this.state };
  }

  /**
   * 设置设计规范画板 ID
   */
  setSpecArtboardId(id) {
    this.specArtboardId = id;
  }

  /**
   * 完成设计规范
   * @param {object} tokens 设计 token (颜色、字体等)
   */
  finalizeSpec(tokens = {}) {
    if (this.state !== 'spec_in_progress') {
      throw new Error('Cannot finalize spec: project is not in spec_in_progress state. Call init_project first.');
    }
    this.designTokens = tokens;
    this.state = 'ready';
    return {
      projectName: this.projectName,
      state: this.state,
      designTokens: this.designTokens,
    };
  }

  /**
   * 检查是否允许创建普通画板
   * @returns {{ allowed: boolean, message?: string }}
   */
  canCreateArtboard() {
    if (this.state === 'idle') {
      return {
        allowed: false,
        message: `⚠️ 工作流约束: 请先调用 init_project 初始化项目。\n\n工作流: init_project → (填充设计规范) → finalize_design_spec → create_artboard\n\nUICanvas 要求每个项目先建立设计规范（配色、字体、间距等），规范确认后才能创建页面设计稿。`,
      };
    }
    if (this.state === 'spec_in_progress') {
      return {
        allowed: false,
        message: `⚠️ 工作流约束: 设计规范尚未完成。请先完善 Design Spec 画板的内容（配色、字体、间距等），然后调用 finalize_design_spec 确认规范。\n\n当前项目: ${this.projectName}\n规范画板: ${this.specArtboardId}`,
      };
    }
    return { allowed: true };
  }

  /** 获取项目状态摘要 */
  toJSON() {
    return {
      state: this.state,
      projectName: this.projectName,
      specArtboardId: this.specArtboardId,
      workflow: this.state === 'idle'
        ? 'Call init_project to start a new project'
        : this.state === 'spec_in_progress'
          ? 'Complete the Design Spec artboard, then call finalize_design_spec'
          : 'Ready — create artboards freely',
    };
  }
}
