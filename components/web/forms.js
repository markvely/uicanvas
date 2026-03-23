// Web Forms — Input, Select, Checkbox, Radio, Tabs (Shadcn-inspired)

export function webInput({ label = 'Email', placeholder = 'Enter your email', value = '', state = 'default', helperText = '' } = {}) {
  const borderColor = state === 'error' ? '#EF4444' : state === 'focused' ? '#FAFAFA' : '#27272A';
  const textColor = value ? '#FAFAFA' : '#52525B';

  return `<div layer-name="Input" style="display:flex; flex-direction:column; gap:6px;">
    ${label ? `<span style="font:500 14px/20px system-ui; color:#FAFAFA;">${label}</span>` : ''}
    <div style="display:flex; align-items:center; padding:8px 12px; background:#09090B; border:1px solid ${borderColor}; border-radius:6px; ${state === 'focused' ? 'box-shadow:0 0 0 2px rgba(250,250,250,0.1);' : ''}">
      <span style="font:400 14px/20px system-ui; color:${textColor}; flex:1;">${value || placeholder}</span>
    </div>
    ${helperText ? `<span style="font:400 12px/16px system-ui; color:${state === 'error' ? '#EF4444' : '#71717A'};">${helperText}</span>` : ''}
  </div>`;
}

export function webSelect({ label = 'Role', value = 'Select a role', options = [] } = {}) {
  return `<div layer-name="Select" style="display:flex; flex-direction:column; gap:6px;">
    ${label ? `<span style="font:500 14px/20px system-ui; color:#FAFAFA;">${label}</span>` : ''}
    <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:#09090B; border:1px solid #27272A; border-radius:6px; cursor:pointer;">
      <span style="font:400 14px/20px system-ui; color:#71717A;">${value}</span>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="#71717A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
  </div>`;
}

export function webCheckbox({ label = 'Accept terms', checked = false } = {}) {
  const box = checked
    ? `<div style="width:16px; height:16px; border-radius:4px; background:#FAFAFA; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#09090B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>`
    : `<div style="width:16px; height:16px; border-radius:4px; border:1.5px solid #27272A; flex-shrink:0;"></div>`;

  return `<div layer-name="Checkbox" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
    ${box}
    <span style="font:400 14px/20px system-ui; color:#FAFAFA;">${label}</span>
  </div>`;
}

export function webRadio({ options = ['Option A', 'Option B', 'Option C'], selectedIndex = 0 } = {}) {
  const radios = options.map((opt, i) => {
    const isSelected = i === selectedIndex;
    const dot = isSelected
      ? `<div style="width:16px; height:16px; border-radius:8px; border:1.5px solid #FAFAFA; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
          <div style="width:8px; height:8px; border-radius:4px; background:#FAFAFA;"></div>
        </div>`
      : `<div style="width:16px; height:16px; border-radius:8px; border:1.5px solid #27272A; flex-shrink:0;"></div>`;
    return `<div style="display:flex; align-items:center; gap:8px; cursor:pointer;">${dot}<span style="font:400 14px/20px system-ui; color:#FAFAFA;">${opt}</span></div>`;
  }).join('');

  return `<div layer-name="Radio Group" style="display:flex; flex-direction:column; gap:10px;">
    ${radios}
  </div>`;
}

export function webTabs({ items = ['Overview', 'Analytics', 'Reports', 'Notifications'], activeIndex = 0, style = 'underline' } = {}) {
  if (style === 'pill') {
    const tabs = items.map((item, i) => {
      const isActive = i === activeIndex;
      return `<div style="padding:6px 14px; font:500 14px/20px system-ui; color:${isActive ? '#FAFAFA' : '#71717A'}; background:${isActive ? '#27272A' : 'transparent'}; border-radius:6px; cursor:pointer;">${item}</div>`;
    }).join('');
    return `<div layer-name="Tabs Pill" style="display:flex; gap:2px; padding:4px; background:#0A0A0D; border-radius:8px; border:1px solid #27272A;">${tabs}</div>`;
  }

  // underline
  const tabs = items.map((item, i) => {
    const isActive = i === activeIndex;
    return `<div style="padding:8px 4px; font:500 14px/20px system-ui; color:${isActive ? '#FAFAFA' : '#71717A'}; border-bottom:2px solid ${isActive ? '#FAFAFA' : 'transparent'}; cursor:pointer;">${item}</div>`;
  }).join('');

  return `<div layer-name="Tabs Underline" style="display:flex; gap:24px; border-bottom:1px solid #27272A;">${tabs}</div>`;
}
