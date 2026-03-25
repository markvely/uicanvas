// lib/workspace-registry.js
// 集中式工作区端口注册表 — 解决多窗口端口隔离问题
//
// 注册表路径: ~/.uicanvas/registry.json
// 格式: { "/normalized/workspace/path": { port: 50147, pid: 12345, ts: 1711111111111 } }

import { existsSync, readFileSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const REGISTRY_DIR  = join(homedir(), '.uicanvas');
const REGISTRY_FILE = join(REGISTRY_DIR, 'registry.json');

/**
 * 路径规整函数 — 保证同一个物理路径在任何上下文中产生相同的 Key
 *   1. realpathSync: 解析软链接 （macOS /var → /private/var）
 *   2. toLowerCase:  解决 Windows 盘符大小写 （C:\ vs c:\）
 */
export function getWorkspaceKey(rawPath) {
  try {
    return realpathSync(rawPath).toLowerCase();
  } catch {
    return rawPath.toLowerCase();
  }
}

/**
 * 读取整个注册表
 */
function readRegistry() {
  try {
    if (existsSync(REGISTRY_FILE)) {
      return JSON.parse(readFileSync(REGISTRY_FILE, 'utf8'));
    }
  } catch { /* corrupt file, start fresh */ }
  return {};
}

/**
 * 写入整个注册表（原子覆盖写入）
 */
function writeRegistry(data) {
  try {
    if (!existsSync(REGISTRY_DIR)) {
      mkdirSync(REGISTRY_DIR, { recursive: true });
    }
    writeFileSync(REGISTRY_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[UICanvas Registry] Failed to write:', err.message);
  }
}

/**
 * 注册一个工作区的端口（由 VSCode 扩展在 activate 时调用）
 * @param {string} workspacePath - 原始工作区路径
 * @param {number} port          - 分配的端口号
 */
export function registerPort(workspacePath, port) {
  const key = getWorkspaceKey(workspacePath);
  const registry = readRegistry();
  registry[key] = {
    port,
    pid: process.pid,
    ts: Date.now(),
  };
  writeRegistry(registry);
  return key;
}

/**
 * 注销一个工作区的端口（由 VSCode 扩展在 deactivate 时调用）
 * @param {string} workspacePath - 原始工作区路径
 */
export function unregisterPort(workspacePath) {
  const key = getWorkspaceKey(workspacePath);
  const registry = readRegistry();
  delete registry[key];
  writeRegistry(registry);
}

/**
 * 查找一个工作区对应的端口（由 MCP stdio 进程调用）
 * @param {string} workspacePath - 原始工作区路径 (通常是 process.cwd())
 * @returns {{ port: number, key: string } | null}
 */
export function lookupPort(workspacePath) {
  const key = getWorkspaceKey(workspacePath);
  const registry = readRegistry();

  // 精确匹配
  if (registry[key]) {
    return { port: registry[key].port, key };
  }

  // 子路径匹配：如果 CWD 是某个注册工作区的子目录，也应该命中
  for (const [registeredKey, entry] of Object.entries(registry)) {
    if (key.startsWith(registeredKey + '/') || key.startsWith(registeredKey + '\\')) {
      return { port: entry.port, key: registeredKey };
    }
  }

  return null;
}
