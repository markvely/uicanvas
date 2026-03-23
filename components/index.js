// Component Gallery — renders component showcases as artboards on the canvas

import { iosNavBar, iosTabBar, iosToolBar } from './ios/navigation.js';
import { iosButton, iosToggle, iosSlider, iosStepper, iosSegmented } from './ios/controls.js';
import { iosList, iosCard, iosSectionGroup } from './ios/content.js';
import { iosTextField, iosSearchBar } from './ios/inputs.js';
import { iosAlert, iosActionSheet, iosToast } from './ios/feedback.js';
import { webHeader, webFooter, webSidebar } from './web/layout.js';
import { webStatCard, webTable } from './web/data.js';
import { webInput, webSelect, webCheckbox, webRadio, webTabs } from './web/forms.js';

/**
 * Section helper — wraps content in a titled section
 */
function section(title, contentHtml) {
  return `<div style="display:flex; flex-direction:column; gap:16px;">
    <span style="font:600 14px/18px system-ui; color:#8E8E93; text-transform:uppercase; letter-spacing:1px;">${title}</span>
    ${contentHtml}
  </div>`;
}

/**
 * Render all component galleries onto the canvas
 * @param {object} renderer — ArtboardRenderer instance
 * @param {number} startX — starting X position for gallery artboards
 */
export function renderComponentGallery(renderer, startX = 1750) {
  const gap = 80;
  let currentX = startX;

  // ═══════════════════════════════
  // iOS Navigation Gallery
  // ═══════════════════════════════
  const iosNavId = 'gallery-ios-nav';
  renderer.create({
    id: iosNavId, name: 'iOS — Navigation',
    width: 390, height: 980, left: currentX, top: 0,
    styles: { backgroundColor: '#000', borderRadius: '12px' }
  });

  renderer.writeHTML({
    targetNodeId: `${iosNavId}-content`, mode: 'insert-children',
    html: `<div layer-name="Gallery Header" style="padding:24px 16px 12px; display:flex; flex-direction:column; gap:4px;">
      <span style="font:700 20px/24px system-ui; color:#fff;">Navigation</span>
      <span style="font:400 13px/18px system-ui; color:#636366;">NavBar, TabBar, ToolBar</span>
    </div>`
  });

  renderer.writeHTML({
    targetNodeId: `${iosNavId}-content`, mode: 'insert-children',
    html: `<div style="display:flex; flex-direction:column; gap:24px; padding:0 0 16px;">
      ${section('Large Title NavBar', iosNavBar({ title: 'Settings', style: 'large' }))}
      ${section('Inline NavBar', iosNavBar({ title: 'Profile', style: 'inline', backLabel: 'Back', rightAction: 'Edit' }))}
      ${section('Tab Bar', iosTabBar({ activeIndex: 0 }))}
      ${section('Tab Bar (Active: Search)', iosTabBar({ activeIndex: 1 }))}
      ${section('Tool Bar', iosToolBar())}
    </div>`
  });

  currentX += 390 + gap;

  // ═══════════════════════════════
  // iOS Controls Gallery
  // ═══════════════════════════════
  const iosCtrlId = 'gallery-ios-ctrl';
  renderer.create({
    id: iosCtrlId, name: 'iOS — Controls',
    width: 390, height: 1200, left: currentX, top: 0,
    styles: { backgroundColor: '#000', borderRadius: '12px' }
  });

  renderer.writeHTML({
    targetNodeId: `${iosCtrlId}-content`, mode: 'insert-children',
    html: `<div layer-name="Gallery Header" style="padding:24px 16px 12px; display:flex; flex-direction:column; gap:4px;">
      <span style="font:700 20px/24px system-ui; color:#fff;">Controls</span>
      <span style="font:400 13px/18px system-ui; color:#636366;">Buttons, Toggles, Sliders, Segmented</span>
    </div>`
  });

  renderer.writeHTML({
    targetNodeId: `${iosCtrlId}-content`, mode: 'insert-children',
    html: `<div style="display:flex; flex-direction:column; gap:24px; padding:0 16px 16px;">
      ${section('Button Styles', `<div style="display:flex; flex-wrap:wrap; gap:8px;">
        ${iosButton({ label: 'Filled', style: 'filled' })}
        ${iosButton({ label: 'Gray', style: 'gray' })}
        ${iosButton({ label: 'Tinted', style: 'tinted' })}
        ${iosButton({ label: 'Outline', style: 'outline' })}
        ${iosButton({ label: 'Plain', style: 'plain' })}
        ${iosButton({ label: 'Disabled', style: 'filled', disabled: true })}
      </div>`)}
      ${section('Button Sizes', `<div style="display:flex; align-items:center; gap:8px;">
        ${iosButton({ label: 'Small', size: 'small' })}
        ${iosButton({ label: 'Medium', size: 'medium' })}
        ${iosButton({ label: 'Large', size: 'large' })}
      </div>`)}
      ${section('Colors', `<div style="display:flex; flex-wrap:wrap; gap:8px;">
        ${iosButton({ label: 'Blue', color: '#0A84FF' })}
        ${iosButton({ label: 'Green', color: '#30D158' })}
        ${iosButton({ label: 'Orange', color: '#FF9F0A' })}
        ${iosButton({ label: 'Red', color: '#FF453A' })}
        ${iosButton({ label: 'Purple', color: '#BF5AF2' })}
      </div>`)}
      ${section('Toggles', `<div style="display:flex; flex-direction:column; gap:12px;">
        ${iosToggle({ on: true, label: 'Airplane Mode' })}
        ${iosToggle({ on: false, label: 'Dark Mode' })}
      </div>`)}
      ${section('Slider', iosSlider({ value: 0.65 }))}
      ${section('Stepper', iosStepper({ value: 3 }))}
      ${section('Segmented', iosSegmented({ items: ['Day', 'Week', 'Month'], activeIndex: 1 }))}
    </div>`
  });

  currentX += 390 + gap;

  // ═══════════════════════════════
  // iOS Content Gallery
  // ═══════════════════════════════
  const iosContentId = 'gallery-ios-content';
  renderer.create({
    id: iosContentId, name: 'iOS — Content',
    width: 390, height: 1100, left: currentX, top: 0,
    styles: { backgroundColor: '#000', borderRadius: '12px' }
  });

  renderer.writeHTML({
    targetNodeId: `${iosContentId}-content`, mode: 'insert-children',
    html: `<div layer-name="Gallery Header" style="padding:24px 16px 12px; display:flex; flex-direction:column; gap:4px;">
      <span style="font:700 20px/24px system-ui; color:#fff;">Content</span>
      <span style="font:400 13px/18px system-ui; color:#636366;">Lists, Cards, Inputs, Search</span>
    </div>`
  });

  renderer.writeHTML({
    targetNodeId: `${iosContentId}-content`, mode: 'insert-children',
    html: `<div style="display:flex; flex-direction:column; gap:24px; padding:0 16px 16px;">
      ${section('Search Bar', iosSearchBar({ placeholder: 'Search Settings' }))}
      ${section('List — Settings Style', iosList({
        header: 'Connectivity',
        items: [
          { title: 'Wi-Fi', value: 'Home', hasArrow: true, iconBg: '#0A84FF', icon: '📶' },
          { title: 'Bluetooth', value: 'On', hasArrow: true, iconBg: '#0A84FF', icon: '🔗' },
          { title: 'Cellular', value: '', hasArrow: true, iconBg: '#30D158', icon: '📱' },
        ]
      }))}
      ${section('List — With Toggles', iosList({
        header: 'Preferences',
        items: [
          { title: 'Airplane Mode', toggle: false, iconBg: '#FF9F0A', icon: '✈️' },
          { title: 'Notifications', toggle: true, iconBg: '#FF453A', icon: '🔔' },
        ]
      }))}
      ${section('Text Fields', `<div style="display:flex; flex-direction:column; gap:12px;">
        ${iosTextField({ label: 'Username', placeholder: 'Enter username' })}
        ${iosTextField({ label: 'Email', value: 'user@email.com', state: 'focused' })}
        ${iosTextField({ label: 'Password', state: 'error', helperText: 'Password is required' })}
      </div>`)}
      ${section('Card', iosCard({ title: 'Mountain View', subtitle: 'A beautiful landscape captured at dawn' }))}
    </div>`
  });

  currentX += 390 + gap;

  // ═══════════════════════════════
  // iOS Feedback Gallery
  // ═══════════════════════════════
  const iosFeedbackId = 'gallery-ios-feedback';
  renderer.create({
    id: iosFeedbackId, name: 'iOS — Feedback',
    width: 400, height: 900, left: currentX, top: 0,
    styles: { backgroundColor: '#000', borderRadius: '12px' }
  });

  renderer.writeHTML({
    targetNodeId: `${iosFeedbackId}-content`, mode: 'insert-children',
    html: `<div layer-name="Gallery Header" style="padding:24px 16px 12px; display:flex; flex-direction:column; gap:4px;">
      <span style="font:700 20px/24px system-ui; color:#fff;">Feedback</span>
      <span style="font:400 13px/18px system-ui; color:#636366;">Alerts, Action Sheets, Toasts</span>
    </div>`
  });

  renderer.writeHTML({
    targetNodeId: `${iosFeedbackId}-content`, mode: 'insert-children',
    html: `<div style="display:flex; flex-direction:column; gap:24px; padding:0 16px 16px; align-items:center;">
      ${section('Alert — Standard', iosAlert({ title: 'Confirm', message: 'Are you sure you want to continue?', buttons: ['Cancel', 'OK'] }))}
      ${section('Alert — Destructive', iosAlert({ title: 'Delete Item?', message: 'This action cannot be undone.', buttons: ['Cancel', 'Delete'], destructiveIndex: 1 }))}
      ${section('Action Sheet', iosActionSheet({ title: 'Photo Options', message: 'Choose an action for this photo' }))}
      ${section('Toasts', `<div style="display:flex; flex-direction:column; gap:8px;">
        ${iosToast({ message: 'Changes saved', type: 'success' })}
        ${iosToast({ message: 'Upload failed', type: 'error' })}
        ${iosToast({ message: 'Update available', type: 'info' })}
      </div>`)}
    </div>`
  });

  currentX += 400 + gap;

  // ═══════════════════════════════
  // Web Components Gallery
  // ═══════════════════════════════
  const webId = 'gallery-web';
  renderer.create({
    id: webId, name: 'Web — Shadcn-Inspired',
    width: 900, height: 1800, left: currentX, top: 0,
    styles: { backgroundColor: '#09090B', borderRadius: '12px' }
  });

  renderer.writeHTML({
    targetNodeId: `${webId}-content`, mode: 'insert-children',
    html: `<div layer-name="Gallery Header" style="padding:32px 32px 16px; display:flex; flex-direction:column; gap:4px;">
      <span style="font:700 24px/30px system-ui; color:#FAFAFA;">Web Components</span>
      <span style="font:400 14px/20px system-ui; color:#71717A;">Shadcn / Vercel Geist inspired dark theme</span>
      <div style="height:1px; background:linear-gradient(90deg, #FAFAFA33, transparent); margin-top:12px;"></div>
    </div>`
  });

  // Header
  renderer.writeHTML({
    targetNodeId: `${webId}-content`, mode: 'insert-children',
    html: `<div style="padding:24px 32px 0; display:flex; flex-direction:column; gap:16px;">
      ${section('Header', webHeader())}
    </div>`
  });

  // Stats Row
  renderer.writeHTML({
    targetNodeId: `${webId}-content`, mode: 'insert-children',
    html: `<div style="padding:24px 32px 0; display:flex; flex-direction:column; gap:16px;">
      ${section('Stat Cards', `<div style="display:flex; gap:16px;">
        ${webStatCard({ label: 'Total Revenue', value: '$45,231', change: '+20.1%', trend: 'up' })}
        ${webStatCard({ label: 'Subscriptions', value: '+2,350', change: '+12.5%', trend: 'up' })}
        ${webStatCard({ label: 'Churn Rate', value: '2.4%', change: '+0.3%', trend: 'down' })}
      </div>`)}
    </div>`
  });

  // Tabs
  renderer.writeHTML({
    targetNodeId: `${webId}-content`, mode: 'insert-children',
    html: `<div style="padding:24px 32px 0; display:flex; flex-direction:column; gap:16px;">
      ${section('Tabs — Underline', webTabs({ activeIndex: 0 }))}
      ${section('Tabs — Pill', webTabs({ activeIndex: 1, style: 'pill' }))}
    </div>`
  });

  // Table
  renderer.writeHTML({
    targetNodeId: `${webId}-content`, mode: 'insert-children',
    html: `<div style="padding:24px 32px 0; display:flex; flex-direction:column; gap:16px;">
      ${section('Data Table', webTable())}
    </div>`
  });

  // Forms
  renderer.writeHTML({
    targetNodeId: `${webId}-content`, mode: 'insert-children',
    html: `<div style="padding:24px 32px 0; display:flex; flex-direction:column; gap:16px;">
      ${section('Form Controls', `<div style="display:flex; gap:24px;">
        <div style="display:flex; flex-direction:column; gap:16px; flex:1;">
          ${webInput({ label: 'Email', placeholder: 'you@example.com' })}
          ${webInput({ label: 'Password', value: '••••••••', state: 'focused' })}
          ${webSelect({ label: 'Role' })}
        </div>
        <div style="display:flex; flex-direction:column; gap:16px; flex:1;">
          ${webCheckbox({ label: 'I agree to terms', checked: true })}
          ${webCheckbox({ label: 'Subscribe to newsletter', checked: false })}
          <div style="margin-top:8px;"></div>
          ${webRadio({ options: ['Free Plan', 'Pro Plan', 'Enterprise'], selectedIndex: 1 })}
        </div>
      </div>`)}
    </div>`
  });

  // Sidebar
  renderer.writeHTML({
    targetNodeId: `${webId}-content`, mode: 'insert-children',
    html: `<div style="padding:24px 32px 0; display:flex; flex-direction:column; gap:16px;">
      ${section('Sidebar Navigation', webSidebar({ activeIndex: 1 }))}
    </div>`
  });

  // Footer
  renderer.writeHTML({
    targetNodeId: `${webId}-content`, mode: 'insert-children',
    html: `<div style="padding:24px 32px 32px; display:flex; flex-direction:column; gap:16px;">
      ${section('Footer', webFooter())}
    </div>`
  });

  console.log('📦 Component gallery rendered');
}
