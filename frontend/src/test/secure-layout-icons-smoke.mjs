import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(here, '..');
const readSource = (...parts) => readFileSync(resolve(srcRoot, ...parts), 'utf8');

const accessSource = readSource('permissions', 'access.js');
const iconSource = readSource('components', 'icons', 'AppIcon.jsx');
const layoutSource = readSource('components', 'layout', 'SecureWorkspaceLayout.jsx');
const componentCss = readSource('styles', 'components.css');
const responsiveCss = readSource('styles', 'responsive.css');
const feedbackCss = readSource('styles', 'feedback.css');
const professionalCss = readSource('styles', 'professional.css');
const ticketActions = readSource('features', 'service-requests', 'components', 'TicketActionCenter.jsx');
const technicianExecution = readSource('features', 'technician', 'components', 'TechnicianTicketExecution.jsx');

for (const icon of ['dashboard', 'ticket', 'book', 'asset', 'wrench', 'users', 'building', 'chart', 'shield', 'info']) {
  assert.match(iconSource, new RegExp(`${icon}:\\s*Lu`), `${icon} should map to a React icon`);
}

for (const mapping of [
  "label: 'Dashboard', icon: 'dashboard'",
  "label: 'Assets', icon: 'asset'",
  "label: 'Staff & Access', icon: 'users'",
  "label: 'Reports', icon: 'chart'",
  "label: 'Audit Logs', icon: 'shield'",
]) {
  assert.ok(accessSource.includes(mapping), `${mapping} should remain configured`);
}

assert.ok(layoutSource.includes('<AppIcon name="bell"'), 'topbar should use the shared bell icon');
assert.ok(layoutSource.includes("name={mobileNavOpen ? 'close' : 'menu'}"), 'mobile menu should expose open and close icons');
assert.ok(layoutSource.includes('aria-label="Close navigation menu"'), 'navigation close control should be labelled');
assert.ok(layoutSource.includes('technician-dashboard-notification-count'), 'topbar should retain unread count');
assert.ok(iconSource.includes("from 'react-icons/lu'"), 'icons should come from the Lucide React icon set');

assert.doesNotMatch(componentCss, /nsc-action-icon/, 'hand-drawn pseudo-icon styles should stay removed');
assert.match(responsiveCss, /@media \(max-width: 960px\)[\s\S]*\.technician-dashboard-sidebar\s*{[\s\S]*position:\s*fixed/, 'mobile sidebar should be an off-canvas drawer');
assert.match(responsiveCss, /\.technician-dashboard-shell\.mobile-nav-open \.technician-dashboard-sidebar\s*{[\s\S]*transform:\s*translateX\(0\)/, 'open navigation should reveal the drawer');
assert.match(feedbackCss, /@media \(prefers-reduced-motion:\s*reduce\)/, 'loading states should respect reduced motion');
assert.match(professionalCss, /@media \(max-width: 640px\)/, 'professional visual layer should include a phone breakpoint');
assert.match(professionalCss, /\.technician-dashboard-content\s*{[\s\S]*max-width:\s*1480px/, 'workspace content should have a readable maximum width');
assert.match(professionalCss, /\.ui-icon-button\s*{[\s\S]*height:\s*40px/, 'icon buttons should maintain accessible targets');
assert.ok(ticketActions.includes('<AppIcon'), 'ticket workflow actions should use shared icons');
assert.ok(technicianExecution.includes('<AppIcon'), 'technician actions should use shared icons');

console.log('secure layout and icon-system smoke checks passed');
