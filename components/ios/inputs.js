// iOS Inputs — TextField, SearchBar

export function iosTextField({ placeholder = 'Placeholder', value = '', label = '', state = 'default', helperText = '' } = {}) {
  const borderColor = state === 'error' ? '#FF453A' : state === 'focused' ? '#0A84FF' : '#38383A';
  const textColor = value ? '#fff' : '#636366';
  const helperColor = state === 'error' ? '#FF453A' : '#8E8E93';

  return `<div layer-name="TextField" style="display:flex; flex-direction:column; gap:6px;">
    ${label ? `<span style="font:400 14px/18px system-ui; color:#8E8E93;">${label}</span>` : ''}
    <div style="display:flex; align-items:center; padding:12px 16px; background:#1C1C1E; border:1.5px solid ${borderColor}; border-radius:10px; ${state === 'focused' ? 'box-shadow:0 0 0 3px rgba(10,132,255,0.2);' : ''}">
      <span style="font:400 17px/22px system-ui; color:${textColor}; flex:1;">${value || placeholder}</span>
      ${value && state !== 'error' ? `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" fill="#636366"/><path d="M6 6l6 6M12 6l-6 6" stroke="#1C1C1E" stroke-width="1.5" stroke-linecap="round"/></svg>` : ''}
      ${state === 'error' ? `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" fill="#FF453A"/><path d="M9 5v5M9 12.5v.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>` : ''}
    </div>
    ${helperText ? `<span style="font:400 12px/16px system-ui; color:${helperColor}; padding:0 4px;">${helperText}</span>` : ''}
  </div>`;
}

export function iosSearchBar({ value = '', placeholder = 'Search' } = {}) {
  return `<div layer-name="SearchBar" style="display:flex; align-items:center; gap:8px; padding:8px 12px; background:#1C1C1E; border-radius:10px;">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="8" r="5.5" stroke="#8E8E93" stroke-width="1.5"/><path d="M12.5 12.5l3 3" stroke="#8E8E93" stroke-width="1.5" stroke-linecap="round"/></svg>
    <span style="font:400 17px/22px system-ui; color:${value ? '#fff' : '#8E8E93'}; flex:1;">${value || placeholder}</span>
    ${value ? `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" fill="#636366"/><path d="M6 6l6 6M12 6l-6 6" stroke="#1C1C1E" stroke-width="1.5" stroke-linecap="round"/></svg>` : ''}
  </div>`;
}
