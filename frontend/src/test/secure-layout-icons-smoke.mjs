import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(here, '..');

const accessSource = readFileSync(resolve(srcRoot, 'permissions', 'access.js'), 'utf8');
const layoutSource = readFileSync(resolve(srcRoot, 'components', 'layout', 'SecureWorkspaceLayout.jsx'), 'utf8');
const cssSource = readFileSync(resolve(srcRoot, 'styles', 'components.css'), 'utf8');
const technicianSidebarSource = readFileSync(
  resolve(srcRoot, 'features', 'technician', 'components', 'TechnicianDashboardSidebar.jsx'),
  'utf8',
);
const serviceRequestFullDetailSource = readFileSync(
  resolve(srcRoot, 'features', 'service-requests', 'components', 'ServiceRequestFullDetail.jsx'),
  'utf8',
);
const ticketActionCenterSource = readFileSync(
  resolve(srcRoot, 'features', 'service-requests', 'components', 'TicketActionCenter.jsx'),
  'utf8',
);
const technicianTicketExecutionSource = readFileSync(
  resolve(srcRoot, 'features', 'technician', 'components', 'TechnicianTicketExecution.jsx'),
  'utf8',
);

const expectedIcons = [
  'dashboard',
  'ticket',
  'book',
  'asset',
  'wrench',
  'users',
  'building',
  'chart',
  'shield',
  'info',
];

for (const icon of expectedIcons) {
  assert.match(cssSource, new RegExp(`technician-dashboard-nav-icon-${icon}`), `${icon} icon CSS should exist`);
}

for (const requiredMapping of [
  "label: 'Dashboard', icon: 'dashboard'",
  "label: 'Assets', icon: 'asset'",
  "label: 'Maintenance', icon: 'wrench'",
  "label: 'Staff & Access', icon: 'users'",
  "label: 'Staff Directory', icon: 'users'",
  "label: 'Departments', icon: 'building'",
  "label: 'Reports', icon: 'chart'",
  "label: 'Audit Logs', icon: 'shield'",
]) {
  assert.ok(accessSource.includes(requiredMapping), `${requiredMapping} should be configured`);
}

assert.ok(technicianSidebarSource.includes("label: 'Assets', icon: 'asset'"), 'legacy technician sidebar should use asset icon');
assert.ok(technicianSidebarSource.includes("label: 'Maintenance', icon: 'wrench'"), 'legacy technician sidebar should use wrench icon');
assert.ok(layoutSource.includes('technician-dashboard-notification-icon'), 'topbar should render a notification bell icon');
assert.ok(layoutSource.includes('technician-dashboard-notification-count'), 'topbar should render notification count badge');
assert.ok(layoutSource.includes('technician-dashboard-menu-button'), 'secure layout should render a mobile menu button');
assert.ok(layoutSource.includes('technician-dashboard-nav-close'), 'secure layout should render a mobile navigation close button');
assert.ok(layoutSource.includes('technician-dashboard-sidebar-backdrop'), 'secure layout should render a mobile navigation backdrop');
assert.ok(layoutSource.includes('mobileNavOpen'), 'secure layout should manage mobile navigation state');
assert.ok(cssSource.includes('.technician-dashboard-notification-icon::before'), 'notification bell cap should be styled');
assert.ok(cssSource.includes('.technician-dashboard-notification-icon::after'), 'notification bell clapper should be styled');
assert.match(cssSource, /\.technician-dashboard-sidebar\s*{[\s\S]*position:\s*sticky/, 'sidebar should stay sticky on desktop pages');
assert.match(cssSource, /\.technician-dashboard-sidebar\s*{[\s\S]*width:\s*224px/, 'sidebar should keep a fixed desktop width');
assert.match(cssSource, /\.technician-dashboard-sidebar\s*{[\s\S]*max-height:\s*100vh/, 'sidebar should not expand beyond the viewport height');
assert.match(cssSource, /Responsive foundation/, 'responsive foundation layer should be documented in CSS');
assert.match(cssSource, /@media \(max-width: 1200px\)/, 'laptop breakpoint should exist');
assert.match(cssSource, /@media \(max-width: 1024px\)/, 'tablet landscape breakpoint should exist');
assert.match(cssSource, /@media \(max-width: 768px\)/, 'tablet/mobile breakpoint should exist');
assert.match(cssSource, /@media \(max-width: 480px\)/, 'small mobile breakpoint should exist');
assert.match(cssSource, /body\s*{[\s\S]*overflow-x:\s*hidden/, 'page should prevent accidental horizontal overflow');
assert.match(cssSource, /\.technician-dashboard-table,\s*[\s\S]*\.secure-dashboard-table,\s*[\s\S]*\.ui-table\s*{[\s\S]*min-width:\s*680px/, 'data tables should keep readable scroll width');
assert.match(cssSource, /@media \(max-width: 768px\)\s*{[\s\S]*\.technician-dashboard-shell,\s*[\s\S]*\.react-shell\s*{[\s\S]*grid-template-columns:\s*1fr/, 'secure shells should stack on mobile');
assert.match(cssSource, /@media \(max-width: 480px\)\s*{[\s\S]*\.technician-dashboard-nav\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/, 'sidebar navigation should become single-column on small mobile');
assert.match(cssSource, /Phase 2 responsive page refinements/, 'phase 2 responsive refinements should be documented in CSS');
assert.match(cssSource, /@media \(max-width: 768px\)\s*{[\s\S]*\.technician-dashboard-topbar\s*{[\s\S]*position:\s*sticky/, 'mobile topbar should stay reachable while scrolling');
assert.match(cssSource, /@media \(max-width: 768px\)\s*{[\s\S]*\.service-request-detail-context\s*{[\s\S]*order:\s*-1/, 'ticket action context should move above long detail content on mobile');
assert.match(cssSource, /@media \(max-width: 768px\)\s*{[\s\S]*\.service-request-row\s*{[\s\S]*border-left:\s*4px solid/, 'service request rows should become card-like on mobile');
assert.match(cssSource, /@media \(max-width: 560px\)\s*{[\s\S]*\.service-request-action-buttons,\s*[\s\S]*\.technician-execution-status-actions\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/, 'critical action buttons should stack on narrow phones');
assert.match(cssSource, /Phase 3 reusable responsive patterns/, 'phase 3 responsive utilities should be documented in CSS');
assert.match(cssSource, /\.responsive-filter-grid\s*{[\s\S]*repeat\(auto-fit,\s*minmax\(190px,\s*1fr\)\)/, 'responsive filter grid utility should auto-fit controls');
assert.match(cssSource, /\.responsive-detail-grid\s*{[\s\S]*minmax\(0,\s*1fr\)\s*minmax\(320px,\s*0\.42fr\)/, 'responsive detail grid should define content and context columns');
assert.match(cssSource, /@media \(max-width: 480px\)\s*{[\s\S]*\.responsive-action-row,\s*[\s\S]*\.responsive-action-grid\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/, 'responsive action utilities should stack on small mobile');
assert.ok(serviceRequestFullDetailSource.includes('responsive-detail-grid'), 'ticket detail should use reusable detail grid');
assert.ok(serviceRequestFullDetailSource.includes('responsive-priority-panel'), 'ticket detail context should use reusable priority panel');
assert.ok(ticketActionCenterSource.includes('responsive-action-grid'), 'ticket action buttons should use reusable action grid');
assert.ok(technicianTicketExecutionSource.includes('responsive-detail-grid'), 'technician execution should use reusable detail grid');
assert.ok(technicianTicketExecutionSource.includes('responsive-action-grid'), 'technician execution status actions should use reusable action grid');
assert.match(cssSource, /\.technician-dashboard-menu-button\s*{[\s\S]*display:\s*none/, 'mobile menu button should be hidden by default on desktop');
assert.match(cssSource, /@media \(max-width: 768px\)\s*{[\s\S]*\.technician-dashboard-sidebar\s*{[\s\S]*position:\s*fixed/, 'mobile sidebar should become an off-canvas drawer');
assert.match(cssSource, /@media \(max-width: 768px\)\s*{[\s\S]*transform:\s*translateX\(-102%\)/, 'mobile sidebar should be hidden off canvas by default');
assert.match(cssSource, /\.technician-dashboard-shell\.mobile-nav-open \.technician-dashboard-sidebar\s*{[\s\S]*transform:\s*translateX\(0\)/, 'open mobile navigation state should slide drawer into view');
assert.match(cssSource, /\.technician-dashboard-shell\.mobile-nav-open \.technician-dashboard-sidebar-backdrop\s*{[\s\S]*pointer-events:\s*auto/, 'open mobile navigation state should enable backdrop interaction');
assert.match(cssSource, /@media \(prefers-reduced-motion:\s*reduce\)\s*{[\s\S]*\.technician-dashboard-sidebar,\s*[\s\S]*\.technician-dashboard-sidebar-backdrop\s*{[\s\S]*transition:\s*none/, 'mobile drawer should respect reduced motion');
assert.match(cssSource, /Phase 5 responsive hardening/, 'phase 5 responsive hardening should be documented in CSS');
assert.match(cssSource, /\.technician-dashboard-content,\s*[\s\S]*\.auth-card-react\s*{[\s\S]*overflow-wrap:\s*anywhere/, 'responsive hardening should prevent long content overflow');
assert.match(cssSource, /\.ui-input,\s*[\s\S]*\.auth-form textarea\s*{[\s\S]*max-width:\s*100%/, 'form controls should not overflow their containers');
assert.match(cssSource, /@media \(max-width: 768px\)\s*{[\s\S]*\.auth-form-panel\s*{[\s\S]*min-height:\s*100vh/, 'auth layout should fit mobile viewport height');
assert.match(cssSource, /@media \(max-width: 768px\)\s*{[\s\S]*\.ticket-create-flow\s*{[\s\S]*max-height:\s*none/, 'ticket create flow should not trap scrolling on mobile');
assert.match(cssSource, /@media \(max-width: 480px\)\s*{[\s\S]*\.ui-modal\s*{[\s\S]*width:\s*calc\(100% - 16px\)/, 'modals should use the available small mobile width');
assert.match(cssSource, /@media \(max-width: 480px\)\s*{[\s\S]*\.ui-modal-footer,\s*[\s\S]*\.technician-execution-card-footer,\s*[\s\S]*\.service-request-detail-title \.ui-inline-actions\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/, 'modal and detail action footers should stack on narrow phones');

console.log('secure layout icon smoke checks passed');
