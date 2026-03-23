// Web Data Display — Stat Card, Table

export function webStatCard({ label = 'Total Revenue', value = '$45,231.89', change = '+20.1%', trend = 'up', sparkline = true } = {}) {
  const trendColor = trend === 'up' ? '#22C55E' : '#EF4444';
  const trendIcon = trend === 'up'
    ? '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 10l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const sparklineEl = sparkline ? `<svg width="80" height="28" viewBox="0 0 80 28" fill="none" style="margin-top:8px;">
    <path d="M0 24 L8 20 L16 22 L24 16 L32 18 L40 12 L48 14 L56 8 L64 10 L72 4 L80 6" stroke="${trendColor}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M0 24 L8 20 L16 22 L24 16 L32 18 L40 12 L48 14 L56 8 L64 10 L72 4 L80 6 V28 H0 Z" fill="${trendColor}" opacity="0.1"/>
  </svg>` : '';

  return `<div layer-name="Stat Card" style="display:flex; flex-direction:column; padding:20px 24px; background:#09090B; border:1px solid #27272A; border-radius:8px; min-width:220px;">
    <span style="font:500 13px/18px system-ui; color:#A1A1AA;">${label}</span>
    <div style="display:flex; align-items:baseline; gap:8px; margin-top:4px;">
      <span style="font:700 28px/34px system-ui; color:#FAFAFA; letter-spacing:-0.5px;">${value}</span>
      <div style="display:flex; align-items:center; gap:2px; color:${trendColor}; font:500 12px/16px system-ui;">
        ${trendIcon} ${change}
      </div>
    </div>
    ${sparklineEl}
  </div>`;
}

export function webTable({ columns = [], rows = [] } = {}) {
  const defaultColumns = columns.length ? columns : ['Name', 'Status', 'Role', 'Email'];
  const defaultRows = rows.length ? rows : [
    ['Olivia Martin', 'Active', 'Admin', 'olivia@acme.com'],
    ['Jackson Lee', 'Active', 'Member', 'jackson@acme.com'],
    ['Isabella Nguyen', 'Inactive', 'Member', 'isabella@acme.com'],
    ['William Kim', 'Active', 'Viewer', 'william@acme.com'],
    ['Sofia Davis', 'Pending', 'Member', 'sofia@acme.com'],
  ];

  const statusColors = {
    'Active': '#22C55E', 'Inactive': '#71717A', 'Pending': '#F59E0B',
  };

  const headerCells = defaultColumns.map(col =>
    `<div style="flex:1; padding:10px 16px; font:500 13px/18px system-ui; color:#A1A1AA;">${col}</div>`
  ).join('');

  const bodyRows = defaultRows.map((row, ri) => {
    const cells = row.map((cell, ci) => {
      const statusColor = ci === 1 ? statusColors[cell] : null;
      const cellContent = statusColor
        ? `<div style="display:flex; align-items:center; gap:6px;">
            <div style="width:6px; height:6px; border-radius:3px; background:${statusColor};"></div>
            <span>${cell}</span>
          </div>`
        : cell;
      return `<div style="flex:1; padding:12px 16px; font:400 14px/20px system-ui; color:#FAFAFA;">${cellContent}</div>`;
    }).join('');
    return `<div style="display:flex; border-top:1px solid #27272A; align-items:center;">${cells}</div>`;
  }).join('');

  return `<div layer-name="Table" style="display:flex; flex-direction:column; background:#09090B; border:1px solid #27272A; border-radius:8px; overflow:hidden;">
    <div style="display:flex; background:#0A0A0D; border-bottom:1px solid #27272A; align-items:center;">${headerCells}</div>
    ${bodyRows}
    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-top:1px solid #27272A;">
      <span style="font:400 13px/18px system-ui; color:#71717A;">Showing 1–5 of 24</span>
      <div style="display:flex; gap:4px;">
        <div style="padding:6px 10px; background:#27272A; border-radius:4px; font:400 13px/18px system-ui; color:#71717A; cursor:pointer;">Previous</div>
        <div style="padding:6px 10px; background:#27272A; border-radius:4px; font:400 13px/18px system-ui; color:#FAFAFA; cursor:pointer;">Next</div>
      </div>
    </div>
  </div>`;
}
