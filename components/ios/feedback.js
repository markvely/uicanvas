// iOS Feedback — Alert, ActionSheet, Toast

export function iosAlert({ title = 'Alert Title', message = 'This is a message.', buttons = ['OK'], destructiveIndex = -1 } = {}) {
  const btnEls = buttons.map((btn, i) => {
    const isDestructive = i === destructiveIndex;
    const isBold = buttons.length === 1 || i === buttons.length - 1;
    const color = isDestructive ? '#FF453A' : '#0A84FF';
    const weight = isBold ? '600' : '400';
    const border = i < buttons.length - 1 ? 'border-right:0.5px solid #38383A;' : '';
    return `<div style="flex:1; padding:12px; text-align:center; font:${weight} 17px/22px system-ui; color:${color}; cursor:pointer; ${border}">${btn}</div>`;
  }).join('');

  return `<div layer-name="Alert" style="width:270px; background:rgba(44,44,46,0.95); -webkit-backdrop-filter:blur(40px); border-radius:14px; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,0.5);">
    <div style="padding:20px 16px 16px; text-align:center; display:flex; flex-direction:column; gap:4px;">
      <span style="font:600 17px/22px system-ui; color:#fff;">${title}</span>
      <span style="font:400 13px/18px system-ui; color:#8E8E93;">${message}</span>
    </div>
    <div style="display:flex; border-top:0.5px solid #38383A;">
      ${btnEls}
    </div>
  </div>`;
}

export function iosActionSheet({ title = '', message = '', actions = [], cancelLabel = 'Cancel' } = {}) {
  const defaultActions = actions.length ? actions : [
    { label: 'Share', destructive: false },
    { label: 'Duplicate', destructive: false },
    { label: 'Delete', destructive: true },
  ];

  const actionItems = defaultActions.map((action, i) => {
    const color = action.destructive ? '#FF453A' : '#0A84FF';
    const border = i < defaultActions.length - 1 ? 'border-bottom:0.5px solid #38383A;' : '';
    return `<div style="padding:16px; text-align:center; font:400 20px/24px system-ui; color:${color}; cursor:pointer; ${border}">${action.label}</div>`;
  }).join('');

  return `<div layer-name="ActionSheet" style="width:340px; display:flex; flex-direction:column; gap:8px;">
    <div style="background:rgba(44,44,46,0.95); -webkit-backdrop-filter:blur(40px); border-radius:14px; overflow:hidden;">
      ${(title || message) ? `<div style="padding:14px 16px; text-align:center; border-bottom:0.5px solid #38383A; display:flex; flex-direction:column; gap:2px;">
        ${title ? `<span style="font:600 13px/18px system-ui; color:#8E8E93;">${title}</span>` : ''}
        ${message ? `<span style="font:400 13px/18px system-ui; color:#636366;">${message}</span>` : ''}
      </div>` : ''}
      ${actionItems}
    </div>
    <div style="background:rgba(44,44,46,0.95); -webkit-backdrop-filter:blur(40px); border-radius:14px; padding:16px; text-align:center; font:600 20px/24px system-ui; color:#0A84FF; cursor:pointer;">
      ${cancelLabel}
    </div>
  </div>`;
}

export function iosToast({ message = 'Saved successfully', type = 'success' } = {}) {
  const colors = {
    success: { bg: 'rgba(48,209,88,0.15)', icon: '#30D158', border: 'rgba(48,209,88,0.3)' },
    error:   { bg: 'rgba(255,69,58,0.15)', icon: '#FF453A', border: 'rgba(255,69,58,0.3)' },
    info:    { bg: 'rgba(10,132,255,0.15)', icon: '#0A84FF', border: 'rgba(10,132,255,0.3)' },
  };
  const c = colors[type] || colors.info;

  const icons = {
    success: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 10l2.5 2.5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    error: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M10 6v5M10 13.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    info: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M10 9v4M10 6.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  };

  return `<div layer-name="Toast" style="display:flex; align-items:center; gap:10px; padding:12px 20px; background:${c.bg}; border:1px solid ${c.border}; border-radius:14px; color:${c.icon}; max-width:340px; box-shadow:0 4px 12px rgba(0,0,0,0.3);">
    ${icons[type] || icons.info}
    <span style="font:500 15px/20px system-ui; color:#fff; flex:1;">${message}</span>
  </div>`;
}
