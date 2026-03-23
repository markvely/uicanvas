// components/design-spec-template.js — 设计规范模板生成器

/**
 * 默认设计 Token
 */
const DEFAULT_TOKENS = {
  colors: {
    primary: '#5E5CE6',
    secondary: '#BF5AF2',
    accent: '#30D158',
    warning: '#FF9F0A',
    danger: '#FF453A',
    background: '#000000',
    surface: '#1C1C1E',
    surfaceElevated: '#2C2C2E',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.6)',
    textTertiary: 'rgba(255,255,255,0.3)',
    border: 'rgba(255,255,255,0.1)',
  },
  fonts: {
    heading: 'SF Pro Display, system-ui, sans-serif',
    body: 'SF Pro Text, system-ui, sans-serif',
    mono: 'SF Mono, monospace',
  },
  fontSizes: {
    'Display': '34px',
    'Title 1': '28px',
    'Title 2': '22px',
    'Title 3': '20px',
    'Headline': '17px',
    'Body': '17px',
    'Callout': '16px',
    'Subhead': '15px',
    'Footnote': '13px',
    'Caption 1': '12px',
    'Caption 2': '11px',
  },
  spacing: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64],
  radii: { sm: '4px', md: '8px', lg: '12px', xl: '16px', full: '9999px' },
};

/**
 * 生成设计规范模板 HTML
 * @param {string} projectName 项目名
 * @param {object} customTokens 自定义 token (与默认值合并)
 * @returns {string} 完整 HTML 字符串
 */
export function generateSpecTemplate(projectName, customTokens = {}) {
  const t = {
    ...DEFAULT_TOKENS,
    ...customTokens,
    colors: { ...DEFAULT_TOKENS.colors, ...customTokens.colors },
    fonts: { ...DEFAULT_TOKENS.fonts, ...customTokens.fonts },
  };

  // ── Color Palette Section ──
  const colorSwatches = Object.entries(t.colors).map(([name, color]) => `
    <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
      <div style="width:64px; height:64px; border-radius:12px; background:${color}; border:1px solid rgba(255,255,255,0.1);"></div>
      <span style="font-size:11px; color:rgba(255,255,255,0.6); text-transform:capitalize;">${name.replace(/([A-Z])/g, ' $1').trim()}</span>
      <span style="font-size:10px; color:rgba(255,255,255,0.3); font-family:monospace;">${color}</span>
    </div>
  `).join('');

  // ── Typography Section ──
  const typeRows = Object.entries(t.fontSizes).map(([name, size]) => {
    const weight = name.startsWith('Display') || name.startsWith('Title') || name === 'Headline' ? '700' : '400';
    return `
    <div style="display:flex; align-items:baseline; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="display:flex; align-items:baseline; gap:16px;">
        <span style="font-size:11px; color:rgba(255,255,255,0.3); width:80px;">${name}</span>
        <span style="font-size:${size}; font-weight:${weight}; color:#fff; font-family:${t.fonts.heading};">Hello World</span>
      </div>
      <span style="font-size:11px; color:rgba(255,255,255,0.3); font-family:monospace;">${size} / ${weight}</span>
    </div>`;
  }).join('');

  // ── Spacing Section ──
  const spacingBars = t.spacing.map(s => `
    <div style="display:flex; align-items:center; gap:12px;">
      <span style="font-size:11px; color:rgba(255,255,255,0.3); width:24px; text-align:right; font-family:monospace;">${s}</span>
      <div style="width:${s}px; height:16px; background:${t.colors.primary}; border-radius:3px; opacity:0.6;"></div>
      <div style="height:16px; flex:1; background:rgba(255,255,255,0.03); border-radius:3px;"></div>
      <span style="font-size:11px; color:rgba(255,255,255,0.2); font-family:monospace;">${s}px</span>
    </div>
  `).join('');

  // ── Border Radius Section ──
  const radiusItems = Object.entries(t.radii).map(([name, val]) => `
    <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
      <div style="width:56px; height:56px; border-radius:${val}; background:${t.colors.surfaceElevated}; border:2px solid ${t.colors.primary};"></div>
      <span style="font-size:11px; color:rgba(255,255,255,0.5);">${name}</span>
      <span style="font-size:10px; color:rgba(255,255,255,0.3); font-family:monospace;">${val}</span>
    </div>
  `).join('');

  return `
<div layer-name="Design Spec" style="display:flex; flex-direction:column; gap:0; width:100%; height:100%; background:#000; padding:40px; overflow-y:auto; font-family:${t.fonts.body}; color:#fff;">

  <!-- Header -->
  <div layer-name="Spec Header" style="display:flex; flex-direction:column; gap:8px; padding-bottom:32px; border-bottom:1px solid rgba(255,255,255,0.1);">
    <span style="font-size:34px; font-weight:700; font-family:${t.fonts.heading};">${projectName}</span>
    <span style="font-size:15px; color:rgba(255,255,255,0.5);">Design System Specification v1.0</span>
  </div>

  <!-- Color Palette -->
  <div layer-name="Color Palette" style="display:flex; flex-direction:column; gap:16px; padding:32px 0; border-bottom:1px solid rgba(255,255,255,0.1);">
    <span style="font-size:20px; font-weight:600;">Color Palette</span>
    <div style="display:flex; flex-wrap:wrap; gap:16px;">
      ${colorSwatches}
    </div>
  </div>

  <!-- Typography -->
  <div layer-name="Typography" style="display:flex; flex-direction:column; gap:12px; padding:32px 0; border-bottom:1px solid rgba(255,255,255,0.1);">
    <span style="font-size:20px; font-weight:600;">Typography</span>
    <div style="display:flex; gap:24px; padding-bottom:8px;">
      <span style="font-size:12px; color:rgba(255,255,255,0.4);">Font Family: ${t.fonts.heading} | ${t.fonts.body} | ${t.fonts.mono}</span>
    </div>
    <div style="display:flex; flex-direction:column;">
      ${typeRows}
    </div>
  </div>

  <!-- Spacing Scale -->
  <div layer-name="Spacing Scale" style="display:flex; flex-direction:column; gap:12px; padding:32px 0; border-bottom:1px solid rgba(255,255,255,0.1);">
    <span style="font-size:20px; font-weight:600;">Spacing Scale</span>
    <div style="display:flex; flex-direction:column; gap:8px;">
      ${spacingBars}
    </div>
  </div>

  <!-- Border Radius -->
  <div layer-name="Border Radius" style="display:flex; flex-direction:column; gap:16px; padding:32px 0;">
    <span style="font-size:20px; font-weight:600;">Border Radius</span>
    <div style="display:flex; gap:24px;">
      ${radiusItems}
    </div>
  </div>

</div>`;
}

export { DEFAULT_TOKENS };
