// Web Components — Header, Footer, Sidebar (Shadcn/Vercel-inspired)

export function webHeader({ logo = 'Acme', navItems = ['Products', 'Solutions', 'Pricing', 'Docs'], cta = 'Sign Up', style = 'dark' } = {}) {
  const nav = navItems.map(item =>
    `<span style="font:400 14px/20px system-ui; color:#A1A1AA; cursor:pointer;">${item}</span>`
  ).join('');

  return `<div layer-name="Web Header" style="display:flex; align-items:center; justify-content:space-between; padding:16px 32px; background:#09090B; border-bottom:1px solid #27272A;">
    <div style="display:flex; align-items:center; gap:6px;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><polygon points="12,2 22,20 2,20" fill="#fff"/></svg>
      <span style="font:700 16px/20px system-ui; color:#FAFAFA;">${logo}</span>
    </div>
    <div style="display:flex; align-items:center; gap:24px;">
      ${nav}
    </div>
    <div style="display:flex; align-items:center; gap:12px;">
      <span style="font:400 14px/20px system-ui; color:#A1A1AA; cursor:pointer;">Log in</span>
      <div style="padding:8px 16px; background:#FAFAFA; color:#09090B; font:500 14px/20px system-ui; border-radius:6px; cursor:pointer;">${cta}</div>
    </div>
  </div>`;
}

export function webFooter({ logo = 'Acme', columns = [] } = {}) {
  const defaultColumns = columns.length ? columns : [
    { title: 'Product', links: ['Features', 'Integrations', 'Pricing', 'Changelog'] },
    { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
    { title: 'Resources', links: ['Documentation', 'Community', 'Support', 'Status'] },
    { title: 'Legal', links: ['Privacy', 'Terms', 'Cookie Policy'] },
  ];

  const cols = defaultColumns.map(col => `
    <div style="display:flex; flex-direction:column; gap:12px; flex:1; min-width:140px;">
      <span style="font:600 13px/18px system-ui; color:#FAFAFA;">${col.title}</span>
      ${col.links.map(link => `<span style="font:400 13px/18px system-ui; color:#71717A; cursor:pointer;">${link}</span>`).join('')}
    </div>
  `).join('');

  return `<div layer-name="Web Footer" style="display:flex; flex-direction:column; gap:32px; padding:48px 32px 24px; background:#09090B; border-top:1px solid #27272A;">
    <div style="display:flex; gap:48px; flex-wrap:wrap;">
      <div style="display:flex; flex-direction:column; gap:8px; flex:1; min-width:200px;">
        <div style="display:flex; align-items:center; gap:6px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polygon points="12,2 22,20 2,20" fill="#fff"/></svg>
          <span style="font:700 14px/20px system-ui; color:#FAFAFA;">${logo}</span>
        </div>
        <span style="font:400 13px/18px system-ui; color:#71717A; max-width:240px;">Build faster, ship more. The platform for modern development.</span>
      </div>
      ${cols}
    </div>
    <div style="display:flex; justify-content:space-between; padding-top:16px; border-top:1px solid #27272A;">
      <span style="font:400 12px/16px system-ui; color:#52525B;">&copy; 2024 ${logo}. All rights reserved.</span>
      <div style="display:flex; gap:16px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#52525B"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57V20.58c-3.33.72-4.035-1.605-4.035-1.605-.555-1.395-1.35-1.77-1.35-1.77-1.095-.75.09-.735.09-.735 1.215.09 1.845 1.245 1.845 1.245 1.08 1.845 2.835 1.314 3.525 1.005.105-.78.42-1.314.765-1.614-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.245-3.225-.135-.3-.54-1.53.105-3.18 0 0 1.005-.33 3.3 1.23a11.4 11.4 0 016 0c2.295-1.56 3.3-1.23 3.3-1.23.645 1.65.24 2.88.12 3.18.765.84 1.23 1.92 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22v3.285c0 .315.225.69.825.57C20.565 21.795 24 17.31 24 12c0-6.63-5.37-12-12-12z"/></svg>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#52525B"><path d="M23.5 6.5a10 10 0 01-2.8.8 5 5 0 002.2-2.7 10 10 0 01-3.1 1.2 5 5 0 00-8.5 4.5A14 14 0 011.7 5a5 5 0 001.5 6.6 5 5 0 01-2.2-.6v.1a5 5 0 004 4.9 5 5 0 01-2.2.1 5 5 0 004.6 3.5A10 10 0 010 21.5a14 14 0 007.5 2.2c9 0 14-7.5 14-14v-.6A10 10 0 0024 6.5z"/></svg>
      </div>
    </div>
  </div>`;
}

export function webSidebar({ items = [], activeIndex = 0 } = {}) {
  const defaultItems = items.length ? items : [
    { label: 'Dashboard', icon: 'grid' },
    { label: 'Analytics', icon: 'chart' },
    { label: 'Projects', icon: 'folder' },
    { label: 'Team', icon: 'users' },
    { label: 'Settings', icon: 'gear' },
  ];

  const icons = {
    grid: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="10" y="2" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="2" y="10" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="10" y="10" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>',
    chart: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 14V8M7 14V4M11 14V10M15 14V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    folder: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 5V14a1 1 0 001 1h12a1 1 0 001-1V7a1 1 0 00-1-1H9l-2-2H3a1 1 0 00-1 1z" stroke="currentColor" stroke-width="1.5"/></svg>',
    users: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="7" cy="6" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M1 16c0-2.8 2.7-5 6-5s6 2.2 6 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="13" cy="6" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M14 11c1.7.5 3 2 3 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    gear: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M9 1.5v1.5M9 15v1.5M1.5 9H3M15 9h1.5M3.4 3.4l1 1M13.6 13.6l1 1M3.4 14.6l1-1M13.6 4.4l1-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  };

  const menuItems = defaultItems.map((item, i) => {
    const isActive = i === activeIndex;
    return `<div style="display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:6px; color:${isActive ? '#FAFAFA' : '#71717A'}; background:${isActive ? '#27272A' : 'transparent'}; cursor:pointer;">
      ${icons[item.icon] || icons.grid}
      <span style="font:500 14px/20px system-ui;">${item.label}</span>
    </div>`;
  }).join('');

  return `<div layer-name="Sidebar" style="display:flex; flex-direction:column; gap:2px; padding:16px 12px; width:220px; background:#09090B; border-right:1px solid #27272A; min-height:400px;">
    <div style="display:flex; align-items:center; gap:8px; padding:8px 12px 16px; border-bottom:1px solid #27272A; margin-bottom:8px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polygon points="12,2 22,20 2,20" fill="#fff"/></svg>
      <span style="font:700 14px/20px system-ui; color:#FAFAFA;">Acme</span>
    </div>
    ${menuItems}
  </div>`;
}
