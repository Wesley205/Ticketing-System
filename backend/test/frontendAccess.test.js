const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ROUTE_ACCESS,
  fallbackAccessProfile,
  normalizeSessionUser,
  statusClass,
  escapeHtml,
} = require('../../frontend/js/api.js');

test('fallbackAccessProfile derives technician and staff frontend scopes', () => {
  const technician = fallbackAccessProfile({ role: 'technician', department_id: 2, user_id: 7 });
  const staff = fallbackAccessProfile({ role: 'staff', department_id: 5, user_id: 9 });

  assert.equal(technician.primary_portal, 'technician');
  assert.equal(technician.scope.assigned_only, true);
  assert.equal(technician.permissions.can_access_technician_portal, true);

  assert.equal(staff.primary_portal, 'department_supervisor');
  assert.equal(staff.scope.department_scope, true);
  assert.equal(staff.permissions.can_manage_assets, false);
});

test('normalizeSessionUser preserves backend access profile when present', () => {
  const user = normalizeSessionUser({
    user_id: 3,
    role: 'admin',
    access_profile: {
      role: 'admin',
      role_label: 'Administrator',
      permissions: { can_view_reports: true },
      scope: { organization_scope: true },
      primary_portal: 'administrator',
    },
  });

  assert.equal(user.access_profile.primary_portal, 'administrator');
  assert.equal(user.access_profile.permissions.can_view_reports, true);
});

test('frontend helpers expose stable route metadata and escaping utilities', () => {
  assert.equal(ROUTE_ACCESS.reports.permission, 'can_view_reports');
  assert.equal(statusClass('In Progress'), 'status-In-Progress');
  assert.equal(escapeHtml(`Tom & 'Jerry'`), 'Tom &amp; &#39;Jerry&#39;');
});
