// components/design-spec-template.js — 设计规范模板生成器

/**
 * 默认设计 Token — 精简专业的移动端标准
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
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.6)',
    border: 'rgba(255,255,255,0.12)',
  },
  fonts: {
    heading: 'SF Pro Display, system-ui, sans-serif',
    body: 'SF Pro Text, system-ui, sans-serif',
    mono: 'SF Mono, monospace',
  },
  fontSizes: {
    'Headline': '24px',
    'Title': '20px',
    'Body': '16px',
    'Caption': '14px',
    'Small': '12px',
  },
  spacing: [4, 8, 16, 24, 32, 48],
  radii: { sm: '8px', md: '12px', lg: '16px', full: '9999px' },
};

/**
 * 生成设计规范模板 HTML
 */
export function generateSpecTemplate(projectName, customTokens = {}) {
  const t = {
    ...DEFAULT_TOKENS,
    ...customTokens,
    colors: { ...DEFAULT_TOKENS.colors, ...customTokens.colors },
    fonts: { ...DEFAULT_TOKENS.fonts, ...customTokens.fonts },
  };

  // ── Color Palette ──
  const colorSwatches = Object.entries(t.colors).map(([name, color]) => `
    <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
      <div style="width:56px; height:56px; border-radius:12px; background:${color}; border:1px solid rgba(255,255,255,0.1);"></div>
      <span style="font-size:11px; color:rgba(255,255,255,0.5); text-transform:capitalize;">${name.replace(/([A-Z])/g, ' $1').trim()}</span>
      <span style="font-size:10px; color:rgba(255,255,255,0.25); font-family:monospace;">${color}</span>
    </div>
  `).join('');

  // ── Typography ──
  const typeRows = Object.entries(t.fontSizes).map(([name, size]) => {
    const weight = name === 'Headline' || name === 'Title' ? '600' : '400';
    return `
    <div style="display:flex; align-items:baseline; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="display:flex; align-items:baseline; gap:16px;">
        <span style="font-size:11px; color:rgba(255,255,255,0.3); width:72px;">${name}</span>
        <span style="font-size:${size}; font-weight:${weight}; color:#fff;">${projectName}</span>
      </div>
      <span style="font-size:11px; color:rgba(255,255,255,0.25); font-family:monospace;">${size} / ${weight}</span>
    </div>`;
  }).join('');

  // ── Spacing ──
  const spacingBars = t.spacing.map(s => `
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="font-size:11px; color:rgba(255,255,255,0.3); width:20px; text-align:right; font-family:monospace;">${s}</span>
      <div style="width:${s}px; height:14px; background:${t.colors.primary}; border-radius:3px; opacity:0.5;"></div>
      <span style="font-size:10px; color:rgba(255,255,255,0.2); font-family:monospace;">${s}px</span>
    </div>
  `).join('');

  // ── Border Radius ──
  const radiusItems = Object.entries(t.radii).map(([name, val]) => `
    <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
      <div style="width:48px; height:48px; border-radius:${val}; background:${t.colors.surface}; border:2px solid ${t.colors.primary};"></div>
      <span style="font-size:11px; color:rgba(255,255,255,0.4);">${name}</span>
      <span style="font-size:10px; color:rgba(255,255,255,0.25); font-family:monospace;">${val}</span>
    </div>
  `).join('');

  // ── Base Components ──
  const btnPrimary = `<div style="display:inline-flex; align-items:center; justify-content:center; height:48px; padding:0 24px; background:${t.colors.primary}; color:#fff; border-radius:12px; font-size:16px; font-weight:600;">Primary</div>`;
  const btnSecondary = `<div style="display:inline-flex; align-items:center; justify-content:center; height:48px; padding:0 24px; background:${t.colors.surface}; color:#fff; border-radius:12px; font-size:16px; font-weight:600; border:1px solid ${t.colors.border};">Secondary</div>`;
  const btnGhost = `<div style="display:inline-flex; align-items:center; justify-content:center; height:48px; padding:0 24px; background:transparent; color:${t.colors.primary}; border-radius:12px; font-size:16px; font-weight:600;">Ghost</div>`;
  const btnDanger = `<div style="display:inline-flex; align-items:center; justify-content:center; height:48px; padding:0 24px; background:${t.colors.danger}; color:#fff; border-radius:12px; font-size:16px; font-weight:600;">Danger</div>`;
  const btnSmall = `<div style="display:inline-flex; align-items:center; justify-content:center; height:36px; padding:0 16px; background:${t.colors.primary}; color:#fff; border-radius:8px; font-size:14px; font-weight:600;">Small</div>`;

  const inputField = `<div style="width:100%; height:48px; background:${t.colors.surface}; border:1px solid ${t.colors.border}; border-radius:12px; display:flex; align-items:center; padding:0 16px; color:rgba(255,255,255,0.3); font-size:16px;">Placeholder text</div>`;

  const card = `<div style="background:${t.colors.surface}; border-radius:16px; padding:16px; border:1px solid ${t.colors.border};">
    <div style="font-size:16px; font-weight:600; color:#fff; margin-bottom:8px;">Card Title</div>
    <div style="font-size:14px; color:rgba(255,255,255,0.6); line-height:1.5;">Card body text with secondary color for description content.</div>
  </div>`;

  const tags = `<div style="display:flex; gap:8px; flex-wrap:wrap;">
    <span style="display:inline-flex; align-items:center; height:28px; padding:0 12px; border-radius:9999px; font-size:12px; font-weight:500; background:${t.colors.primary}; color:#fff;">Active</span>
    <span style="display:inline-flex; align-items:center; height:28px; padding:0 12px; border-radius:9999px; font-size:12px; font-weight:500; background:${t.colors.surface}; color:rgba(255,255,255,0.6); border:1px solid ${t.colors.border};">Default</span>
    <span style="display:inline-flex; align-items:center; height:28px; padding:0 12px; border-radius:9999px; font-size:12px; font-weight:500; background:rgba(48,209,88,0.15); color:${t.colors.accent};">Success</span>
    <span style="display:inline-flex; align-items:center; height:28px; padding:0 12px; border-radius:9999px; font-size:12px; font-weight:500; background:rgba(255,69,58,0.15); color:${t.colors.danger};">Error</span>
  </div>`;

  const avatars = `<div style="display:flex; align-items:center; gap:12px;">
    <div style="width:32px; height:32px; border-radius:50%; background:${t.colors.primary}; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:600; color:#fff;">S</div>
    <div style="width:40px; height:40px; border-radius:50%; background:${t.colors.secondary}; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:600; color:#fff;">M</div>
    <div style="width:48px; height:48px; border-radius:50%; background:${t.colors.accent}; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:600; color:#fff;">L</div>
  </div>`;

  // ── Section helper ──
  const section = (title, content) => `
  <div style="display:flex; flex-direction:column; gap:16px; padding:28px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
    <span style="font-size:16px; font-weight:600; color:rgba(255,255,255,0.85); letter-spacing:0.5px; text-transform:uppercase;">${title}</span>
    ${content}
  </div>`;

  return `
<div layer-name="Design Spec" style="display:flex; flex-direction:column; gap:0; width:100%; height:auto; min-height:100%; background:#000; padding:36px; font-family:${t.fonts.body}; color:#fff; box-sizing:border-box;">

  <!-- Header -->
  <div layer-name="Header" style="display:flex; flex-direction:column; gap:6px; padding-bottom:28px; border-bottom:1px solid rgba(255,255,255,0.08);">
    <span style="font-size:28px; font-weight:700;">${projectName}</span>
    <span style="font-size:13px; color:rgba(255,255,255,0.4);">Design System v1.0</span>
  </div>

  ${section('Colors', `<div style="display:flex; flex-wrap:wrap; gap:12px;">${colorSwatches}</div>`)}

  ${section('Typography', `
    <div style="font-size:11px; color:rgba(255,255,255,0.3); margin-bottom:4px;">Heading: ${t.fonts.heading} · Body: ${t.fonts.body}</div>
    <div style="display:flex; flex-direction:column;">${typeRows}</div>
  `)}

  ${section('Spacing', `<div style="display:flex; flex-direction:column; gap:6px;">${spacingBars}</div>`)}

  ${section('Radius', `<div style="display:flex; gap:20px;">${radiusItems}</div>`)}

  ${section('Buttons', `
    <div style="display:flex; flex-direction:column; gap:12px;">
      <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
        ${btnPrimary} ${btnSecondary} ${btnGhost} ${btnDanger}
      </div>
      <div style="display:flex; gap:12px; align-items:center;">
        ${btnSmall}
        <span style="font-size:11px; color:rgba(255,255,255,0.3);">H: 48px (default) / 36px (small) · Radius: 12px / 8px</span>
      </div>
    </div>
  `)}

  ${section('Input', `
    <div style="display:flex; flex-direction:column; gap:8px;">
      ${inputField}
      <span style="font-size:11px; color:rgba(255,255,255,0.3);">H: 48px · Radius: 12px · Padding: 0 16px</span>
    </div>
  `)}

  ${section('Card', `${card}`)}

  ${section('Tags', `${tags}`)}

  ${section('Avatar', `
    <div style="display:flex; flex-direction:column; gap:8px;">
      ${avatars}
      <span style="font-size:11px; color:rgba(255,255,255,0.3);">32px (S) / 40px (M) / 48px (L)</span>
    </div>
  `)}

</div>`;
}

export { DEFAULT_TOKENS };
