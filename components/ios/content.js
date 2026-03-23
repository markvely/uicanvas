// iOS Content — List, Card, Section Group

export function iosList({ items = [], style = 'insetGrouped', header = '' } = {}) {
  const defaultItems = items.length ? items : [
    { title: 'Wi-Fi', value: 'Home Network', hasArrow: true, icon: '📶', iconBg: '#0A84FF' },
    { title: 'Bluetooth', value: 'On', hasArrow: true, icon: '🔗', iconBg: '#0A84FF' },
    { title: 'Cellular', value: '', hasArrow: true, icon: '📱', iconBg: '#30D158' },
  ];

  const arrow = `<svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="#636366" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const listItems = defaultItems.map((item, i) => {
    const isLast = i === defaultItems.length - 1;
    const iconEl = item.iconBg ? `<div style="width:30px; height:30px; border-radius:7px; background:${item.iconBg}; display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0;">${item.icon || ''}</div>` : '';

    return `<div style="display:flex; align-items:center; gap:12px; padding:12px 16px; ${!isLast ? 'border-bottom:0.5px solid #38383A;' : ''}">
      ${iconEl}
      <span style="font:400 17px/22px system-ui; color:#fff; flex:1;">${item.title}</span>
      ${item.value ? `<span style="font:400 17px/22px system-ui; color:#8E8E93;">${item.value}</span>` : ''}
      ${item.toggle !== undefined ? iosToggleInline(item.toggle) : ''}
      ${item.hasArrow ? arrow : ''}
    </div>`;
  }).join('');

  const headerEl = header ? `<div style="padding:0 16px 6px; font:400 13px/18px system-ui; color:#8E8E93; text-transform:uppercase;">${header}</div>` : '';

  if (style === 'insetGrouped') {
    return `<div layer-name="List" style="display:flex; flex-direction:column; gap:0;">
      ${headerEl}
      <div style="background:#1C1C1E; border-radius:10px; overflow:hidden;">
        ${listItems}
      </div>
    </div>`;
  }

  return `<div layer-name="List" style="display:flex; flex-direction:column; gap:0;">
    ${headerEl}
    ${listItems}
  </div>`;
}

function iosToggleInline(on) {
  const track = on ? 'background:#30D158;' : 'background:#38383A;';
  const thumbPos = on ? 'left:22px;' : 'left:2px;';
  return `<div style="position:relative; width:51px; height:31px; border-radius:16px; ${track} flex-shrink:0;">
    <div style="position:absolute; top:2px; ${thumbPos} width:27px; height:27px; border-radius:14px; background:#fff; box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>
  </div>`;
}

export function iosCard({ title = '', subtitle = '', imageUrl = '', children = '' } = {}) {
  const img = imageUrl ? `<div style="width:100%; height:180px; background:linear-gradient(135deg, #1C1C1E, #2C2C2E); border-radius:12px 12px 0 0; overflow:hidden;">
    <img src="${imageUrl}" style="width:100%; height:100%; object-fit:cover;" />
  </div>` : '';

  const hasImage = !!imageUrl;

  return `<div layer-name="Card" style="display:flex; flex-direction:column; background:#1C1C1E; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.3);">
    ${img || `<div style="width:100%; height:160px; background:linear-gradient(135deg, #2C2C2E 0%, #3A3A3C 100%); display:flex; align-items:center; justify-content:center;">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="6" y="10" width="36" height="28" rx="3" stroke="#636366" stroke-width="2"/><circle cx="16" cy="20" r="4" stroke="#636366" stroke-width="2"/><path d="M6 32l10-8 8 6 8-10 10 12" stroke="#636366" stroke-width="2" stroke-linejoin="round"/></svg>
    </div>`}
    <div style="padding:12px 16px; display:flex; flex-direction:column; gap:4px;">
      ${title ? `<span style="font:600 17px/22px system-ui; color:#fff;">${title}</span>` : ''}
      ${subtitle ? `<span style="font:400 14px/18px system-ui; color:#8E8E93;">${subtitle}</span>` : ''}
      ${children}
    </div>
  </div>`;
}

export function iosSectionGroup({ title = '', children = '' } = {}) {
  return `<div layer-name="Section" style="display:flex; flex-direction:column; gap:6px;">
    ${title ? `<span style="padding:0 16px; font:400 13px/18px system-ui; color:#8E8E93; text-transform:uppercase; letter-spacing:0.5px;">${title}</span>` : ''}
    <div style="background:#1C1C1E; border-radius:10px; overflow:hidden;">
      ${children}
    </div>
  </div>`;
}
