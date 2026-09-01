const test = require('node:test');
const assert = require('node:assert/strict');

test('React access helpers derive technician and staff frontend scopes', async () => {
  const { buildAccessProfile } = await import('../../frontend/src/permissions/access.js');
  const technician = buildAccessProfile({ role: 'technician', department_id: 2, user_id: 7 });
  const staff = buildAccessProfile({ role: 'staff', department_id: 5, user_id: 9 });

  assert.equal(technician.primary_portal, 'technician');
  assert.equal(technician.scope.assigned_only, true);
  assert.equal(technician.permissions.can_access_technician_portal, true);

  assert.equal(staff.primary_portal, 'department_supervisor');
  assert.equal(staff.scope.department_scope, true);
  assert.equal(staff.permissions.can_manage_assets, false);
});

test('React access helpers preserve backend access profile when present', async () => {
  const { normalizeAccessProfile } = await import('../../frontend/src/permissions/access.js');
  const profile = normalizeAccessProfile(
    {
      role: 'admin',
      role_label: 'Administrator',
      permissions: { can_view_reports: true },
      scope: { organization_scope: true },
      primary_portal: 'administrator',
    },
    { user_id: 3, role: 'admin' }
  );

  assert.equal(profile.primary_portal, 'administrator');
  assert.equal(profile.permissions.can_view_reports, true);
});

test('React access helpers expose stable route metadata', async () => {
  const { ROUTE_PERMISSIONS, buildAccessProfile, canAccessRoute } = await import('../../frontend/src/permissions/access.js');
  const admin = buildAccessProfile({ role: 'admin', user_id: 1 });
  const staff = buildAccessProfile({ role: 'staff', user_id: 2 });

  assert.equal(ROUTE_PERMISSIONS['/reports'], 'can_view_reports');
  assert.equal(canAccessRoute(admin, '/reports'), true);
  assert.equal(canAccessRoute(staff, '/audit-logs'), false);
});
