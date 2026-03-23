// iOS Controls — Button, Toggle, Slider, Stepper, Segmented

export function iosButton({ label = 'Button', style = 'filled', size = 'medium', color = '#0A84FF', disabled = false } = {}) {
  const sizes = {
    small:  'padding:7px 16px; font:600 14px/18px system-ui; border-radius:8px;',
    medium: 'padding:14px 20px; font:600 17px/22px system-ui; border-radius:14px;',
    large:  'padding:18px 24px; font:600 20px/24px system-ui; border-radius:16px;',
  };

  const styles = {
    filled:  `background:${disabled ? '#38383A' : color}; color:${disabled ? '#636366' : '#fff'};`,
    gray:    `background:#2C2C2E; color:${disabled ? '#636366' : '#fff'};`,
    tinted:  `background:${color}22; color:${disabled ? '#636366' : color};`,
    outline: `background:transparent; border:1.5px solid ${disabled ? '#38383A' : color}; color:${disabled ? '#636366' : color};`,
    plain:   `background:transparent; color:${disabled ? '#636366' : color};`,
  };

  return `<div layer-name="Button ${style}" style="display:flex; align-items:center; justify-content:center; ${sizes[size] || sizes.medium} ${styles[style] || styles.filled}">${label}</div>`;
}

export function iosToggle({ on = false, label = '' } = {}) {
  const track = on
    ? 'background:#30D158;'
    : 'background:#38383A;';
  const thumbPos = on ? 'left:22px;' : 'left:2px;';

  const toggle = `<div style="position:relative; width:51px; height:31px; border-radius:16px; ${track} flex-shrink:0;">
    <div style="position:absolute; top:2px; ${thumbPos} width:27px; height:27px; border-radius:14px; background:#fff; box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>
  </div>`;

  if (label) {
    return `<div layer-name="Toggle" style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <span style="font:400 17px/22px system-ui; color:#fff;">${label}</span>
      ${toggle}
    </div>`;
  }
  return toggle;
}

export function iosSlider({ value = 0.5, minColor = '#0A84FF', trackColor = '#38383A' } = {}) {
  const pct = Math.round(value * 100);
  return `<div layer-name="Slider" style="display:flex; align-items:center; gap:0; width:100%;">
    <div style="flex:1; height:4px; border-radius:2px; background:${trackColor}; position:relative; overflow:visible;">
      <div style="position:absolute; left:0; top:0; width:${pct}%; height:100%; background:${minColor}; border-radius:2px;"></div>
      <div style="position:absolute; left:${pct}%; top:50%; transform:translate(-50%,-50%); width:28px; height:28px; border-radius:14px; background:#fff; box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
    </div>
  </div>`;
}

export function iosStepper({ value = 1, min = 0, max = 10 } = {}) {
  return `<div layer-name="Stepper" style="display:flex; align-items:center; border:1px solid #38383A; border-radius:8px; overflow:hidden;">
    <div style="padding:8px 14px; color:#0A84FF; font:400 22px/26px system-ui; border-right:1px solid #38383A; cursor:pointer;">−</div>
    <div style="padding:8px 18px; color:#fff; font:500 17px/22px system-ui; min-width:40px; text-align:center;">${value}</div>
    <div style="padding:8px 14px; color:#0A84FF; font:400 22px/26px system-ui; border-left:1px solid #38383A; cursor:pointer;">+</div>
  </div>`;
}

export function iosSegmented({ items = ['First', 'Second', 'Third'], activeIndex = 0 } = {}) {
  const segments = items.map((item, i) => {
    const isActive = i === activeIndex;
    return `<div style="flex:1; padding:7px 12px; text-align:center; font:500 13px/18px system-ui; color:${isActive ? '#fff' : '#8E8E93'}; background:${isActive ? '#636366' : 'transparent'}; border-radius:7px;">${item}</div>`;
  }).join('');

  return `<div layer-name="Segmented" style="display:flex; gap:1px; padding:2px; background:#1C1C1E; border-radius:9px;">
    ${segments}
  </div>`;
}
