const test = require('node:test');
const assert = require('node:assert/strict');

const constants = require('./auditLog.constants');
const mapper = require('./auditLog.mapper');
const policy = require('./auditLog.policy');
const repository = require('./auditLog.repository');
const routes = require('./auditLog.routes');
const service = require('./auditLog.service');

test('audit-log service parses filters and caps limits', () => {
  const filters = service.parseAuditLogFilters({
    user_id: '4',
    action: 'logged',
    from: '2026-08-01',
    to: '2026-08-29',
    limit: '9999',
  });

  assert.equal(filters.user_id, 4);
  assert.equal(filters.action, 'logged');
  assert.equal(filters.limit, constants.MAX_AUDIT_LOG_LIMIT);
});

test('audit-log repository builds parameterized list query', () => {
  const query = repository.buildAuditLogListQuery({
    user_id: 5,
    action: 'created',
    from: '2026-08-01',
    to: '2026-08-29',
    limit: 20,
  });

  assert.match(query.where, /al\.user_id = \$1/);
  assert.match(query.where, /al\.action ILIKE \$2/);
  assert.equal(query.limitParam, 5);
  assert.deepEqual(query.params, [5, '%created%', '2026-08-01', '2026-08-29', 20]);
});

test('audit-log mapper preserves legacy row shape', () => {
  const rows = mapper.mapAuditLogRows([{ log_id: 1, action: 'User logged in' }]);
  assert.deepEqual(rows, [{ log_id: 1, action: 'User logged in' }]);
});

test('audit-log policy requires audit permission', () => {
  assert.equal(policy.canAccessAuditLogs({ user_id: 1, role: 'admin', is_active: true, account_status: 'active' }), true);
  assert.equal(policy.canAccessAuditLogs({ user_id: 2, role: 'staff', is_active: true, account_status: 'active' }), false);
});

test('audit-log route preserves endpoint surface', () => {
  const endpoints = routes.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);

  assert.deepEqual(endpoints, ['GET /']);
});

test('audit-log write failures remain non-blocking', async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    await service.logAction(1, 'Action', 'record', 2, 'details', {
      async query() {
        throw new Error('write failed');
      },
    });
  } finally {
    console.error = originalError;
  }
});
