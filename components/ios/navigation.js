// iOS Navigation Components — NavBar, TabBar, ToolBar

export function iosNavBar({ title = 'Settings', style = 'large', backLabel = '', rightAction = '', bgColor = '#000' } = {}) {
  const backBtn = backLabel ? `
    <div style="display:flex; align-items:center; gap:2px; color:#0A84FF; font:400 17px/22px system-ui; cursor:pointer;">
      <svg width="12" height="20" viewBox="0 0 12 20" fill="none"><path d="M10 2L2 10l8 8" stroke="#0A84FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      ${backLabel}
    </div>` : '<div style="width:60px;"></div>';

  const rightBtn = rightAction ? `
    <div style="color:#0A84FF; font:400 17px/22px system-ui;">${rightAction}</div>` : '<div style="width:60px;"></div>';

  if (style === 'large') {
    return `<div layer-name="NavBar Large" style="display:flex; flex-direction:column; padding:0; background:${bgColor};">
      <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px 4px; min-height:44px;">
        ${backBtn}
        <div style="flex:1;"></div>
        ${rightBtn}
      </div>
      <div style="padding:0 16px 8px;">
        <span style="font:700 34px/41px system-ui; color:#fff; letter-spacing:0.4px;">${title}</span>
      </div>
    </div>`;
  }

  // inline style
  return `<div layer-name="NavBar Inline" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; min-height:44px; background:${bgColor};">
    ${backBtn}
    <span style="font:600 17px/22px system-ui; color:#fff; flex:1; text-align:center;">${title}</span>
    ${rightBtn}
  </div>`;
}

export function iosTabBar({ tabs = [], activeIndex = 0 } = {}) {
  const defaultTabs = tabs.length ? tabs : [
    { icon: 'house', label: 'Home' },
    { icon: 'magnifyingglass', label: 'Search' },
    { icon: 'plus.circle', label: 'Create' },
    { icon: 'bell', label: 'Notifications' },
    { icon: 'person', label: 'Profile' },
  ];

  // Simple SVG icons for each tab
  const icons = {
    'house': '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 11l8-8 8 8M5 9.5V18a1 1 0 001 1h3.5v-5h3v5H16a1 1 0 001-1V9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    'magnifyingglass': '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="9.5" cy="9.5" r="5.5" stroke="currentColor" stroke-width="1.5"/><path d="M14 14l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    'plus.circle': '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M11 7v8M7 11h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    'bell': '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 3a5 5 0 00-5 5v3l-1.5 3h13L16 11V8a5 5 0 00-5-5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 17a2 2 0 004 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    'person': '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="7" r="3.5" stroke="currentColor" stroke-width="1.5"/><path d="M4 19c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    'gear': '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.9 4.9l1.4 1.4M15.7 15.7l1.4 1.4M4.9 17.1l1.4-1.4M15.7 6.3l1.4-1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    'heart': '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 18s-7-4.5-7-9a4 4 0 018 0 4 4 0 018 0c0 4.5-7 9-7 9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  };

  const tabItems = defaultTabs.map((tab, i) => {
    const isActive = i === activeIndex;
    const color = isActive ? '#0A84FF' : '#8E8E93';
    const iconSvg = icons[tab.icon] || icons['house'];
    return `<div style="display:flex; flex-direction:column; align-items:center; gap:2px; flex:1; color:${color}; cursor:pointer;">
      ${iconSvg}
      <span style="font:500 10px/12px system-ui;">${tab.label}</span>
    </div>`;
  }).join('');

  return `<div layer-name="TabBar" style="display:flex; align-items:flex-end; padding:6px 0 28px; background:rgba(28,28,30,0.92); -webkit-backdrop-filter:blur(20px); border-top:0.5px solid rgba(255,255,255,0.08);">
    ${tabItems}
  </div>`;
}

export function iosToolBar({ items = ['Bold', 'Italic', 'Link', 'Image'] } = {}) {
  return `<div layer-name="ToolBar" style="display:flex; justify-content:space-around; align-items:center; padding:10px 16px 28px; background:rgba(28,28,30,0.92); -webkit-backdrop-filter:blur(20px); border-top:0.5px solid rgba(255,255,255,0.08);">
    ${items.map(item => `<div style="color:#0A84FF; font:400 17px/22px system-ui; padding:8px 12px;">${item}</div>`).join('')}
  </div>`;
}
