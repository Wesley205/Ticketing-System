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
assert.ok(cssSource.includes('.technician-dashboard-notification-icon::before'), 'notification bell cap should be styled');
assert.ok(cssSource.includes('.technician-dashboard-notification-icon::after'), 'notification bell clapper should be styled');
assert.match(cssSource, /\.technician-dashboard-sidebar\s*{[\s\S]*position:\s*sticky/, 'sidebar should stay sticky on desktop pages');
assert.match(cssSource, /\.technician-dashboard-sidebar\s*{[\s\S]*width:\s*224px/, 'sidebar should keep a fixed desktop width');
assert.match(cssSource, /\.technician-dashboard-sidebar\s*{[\s\S]*max-height:\s*100vh/, 'sidebar should not expand beyond the viewport height');

console.log('secure layout icon smoke checks passed');
