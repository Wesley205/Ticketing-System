const test = require('node:test');
const assert = require('node:assert/strict');

const constants = require('./staff.constants');
const mapper = require('./staff.mapper');
const repository = require('./staff.repository');
const routes = require('./staff.routes');
const service = require('./staff.service');

test('staff module exposes canonical role and user-type constants', () => {
  assert.ok(constants.USER_ROLES.includes('admin'));
  assert.ok(constants.USER_ROLES.includes('ict_officer'));
  assert.ok(constants.USER_ROLES.includes('technician'));
  assert.ok(constants.USER_ROLES.includes('staff'));
  assert.ok(constants.USER_TYPES.includes('employee'));
  assert.ok(constants.TEMPORARY_USER_TYPES.includes('contractor'));
});

test('staff mapper strips credential fields and keeps lifecycle fields', () => {
  const mapped = mapper.mapStaffRow({
    user_id: 9,
    full_name: 'Ada User',
    email: 'ada@nscict.local',
    username: 'ada',
    password_hash: 'secret-hash',
    role: 'staff',
    user_type: 'employee',
    is_active: true,
    account_status: 'active',
  });

  assert.equal(mapped.full_name, 'Ada User');
  assert.equal(mapped.account_status, 'active');
  assert.equal(Object.hasOwn(mapped, 'password_hash'), false);
});

test('staff repository builds filtered staff-list SQL without executing routes', () => {
  const query = repository.buildStaffListQuery({
    search: 'ada',
    role: 'staff',
    user_type: 'employee',
    department_id: 2,
  });

  assert.match(query.sql, /FROM users u/i);
  assert.match(query.sql, /LEFT JOIN departments d/i);
  assert.match(query.sql, /u\.role = \$2/i);
  assert.match(query.sql, /u\.user_type = \$3/i);
  assert.match(query.sql, /u\.department_id = \$4/i);
  assert.deepEqual(query.params, ['%ada%', 'staff', 'employee', 2]);
});

test('staff service exposes the legacy staff account helpers', () => {
  assert.equal(typeof service.createStaffAccount, 'function');
  assert.equal(typeof service.updateStaffAccount, 'function');
  assert.equal(typeof service.changeStaffStatus, 'function');
  assert.equal(typeof service.extendTemporaryAccount, 'function');
  assert.equal(typeof service.listStaff, 'function');
});

test('staff status repository keeps account_status aligned with is_active', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [{ user_id: 5, full_name: 'Inactive User', is_active: false, account_status: 'deactivated' }] };
    },
  };

  const user = await repository.updateStaffStatus(client, 5, {
    is_active: false,
    deactivation_reason: 'Testing deactivation',
  });

  assert.equal(user.account_status, 'deactivated');
  assert.match(calls[0].sql, /account_status = CASE WHEN \$1 THEN 'active' ELSE 'deactivated' END/i);
});

test('staff router preserves the existing endpoint surface', () => {
  const routeSignatures = routes.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods).sort().join(',').toUpperCase()} ${layer.route.path}`);

  assert.deepEqual(routeSignatures, [
    'GET /',
    'GET /technicians',
    'POST /',
    'PUT /:id',
    'PATCH /:id/status',
    'PATCH /:id/extend',
  ]);
});
