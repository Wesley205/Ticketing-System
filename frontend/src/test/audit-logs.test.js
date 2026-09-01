import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAuditLogQuery,
  normalizeAuditLogRow,
} from '../features/audit-logs/services/audit-logs-api.js';
import { buildAccessProfile, canAccessRoute } from '../permissions/access.js';

test('audit-log query builder preserves backend-supported filters only', () => {
  const query = buildAuditLogQuery({
    action: 'logged in',
    user_id: 12,
    from: '2026-08-01',
    to: '2026-09-01',
    limit: 50,
    unsafe: 'ignored',
  });

  assert.equal(
    query.toString(),
    'action=logged+in&user_id=12&from=2026-08-01&to=2026-09-01&limit=50'
  );
});

test('audit-log row normalizer keeps display values read-only and stable', () => {
  const row = normalizeAuditLogRow({
    log_id: '4',
    action: 'Ticket assigned',
    record_type: 'service_request',
    record_id: 8,
  });

  assert.equal(row.log_id, 4);
  assert.equal(row.user_name, 'System');
  assert.equal(row.user_role, '-');
  assert.equal(row.details, '-');
});

test('audit-log route is restricted to oversight roles while about remains authenticated-only', () => {
  const staffProfile = buildAccessProfile({ user_id: 9, role: 'staff', department_id: 4 });
  const officerProfile = buildAccessProfile({ user_id: 2, role: 'ict_officer', department_id: 1 });
  const adminProfile = buildAccessProfile({ user_id: 1, role: 'admin', department_id: 1 });

  assert.equal(canAccessRoute(staffProfile, '/audit-logs'), false);
  assert.equal(canAccessRoute(officerProfile, '/audit-logs'), true);
  assert.equal(canAccessRoute(adminProfile, '/audit-logs'), true);
  assert.equal(canAccessRoute(staffProfile, { path: '/about' }), true);
});
