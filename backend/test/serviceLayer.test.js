const test = require('node:test');
const assert = require('node:assert/strict');

const { createDepartment, updateDepartment } = require('../src/modules/departments/department.service');
const {
  changeStaffStatus,
  extendTemporaryAccount,
  updateStaffAccount,
} = require('../src/modules/staff/staff.service');

function createExecutor(handler) {
  const queries = [];
  const client = {
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [] };
      }
      return handler(sql, params);
    },
    release() {
      queries.push({ sql: 'RELEASE', params: [] });
    },
  };

  return {
    queries,
    executor: {
      async connect() {
        return client;
      },
    },
  };
}

test('createDepartment writes department and audit log in one transaction', async () => {
  const { executor, queries } = createExecutor((sql) => {
    if (/INSERT INTO departments/i.test(sql)) {
      return { rows: [{ department_id: 7, name: 'Operations' }] };
    }
    if (/INSERT INTO audit_logs/i.test(sql)) {
      return { rows: [] };
    }
    throw new Error(`unexpected SQL: ${sql}`);
  });

  const department = await createDepartment({
    name: 'Operations',
    description: 'Ops team',
    actorUserId: 1,
  }, executor);

  assert.equal(department.department_id, 7);
  assert.deepEqual(queries.map((q) => q.sql === 'BEGIN' || q.sql === 'COMMIT' || q.sql === 'RELEASE' ? q.sql : 'SQL'), [
    'BEGIN',
    'SQL',
    'SQL',
    'COMMIT',
    'RELEASE',
  ]);
});

test('updateDepartment returns null without writing audit log when record is missing', async () => {
  const { executor, queries } = createExecutor((sql) => {
    if (/UPDATE departments/i.test(sql)) {
      return { rows: [] };
    }
    if (/INSERT INTO audit_logs/i.test(sql)) {
      throw new Error('audit log should not be written');
    }
    throw new Error(`unexpected SQL: ${sql}`);
  });

  const department = await updateDepartment({
    departmentId: 99,
    name: 'Missing',
    description: null,
    actorUserId: 1,
  }, executor);

  assert.equal(department, null);
  assert.equal(queries.some((q) => /INSERT INTO audit_logs/i.test(q.sql)), false);
});

test('updateStaffAccount bumps session version and logs the profile change', async () => {
  const { executor, queries } = createExecutor((sql) => {
    if (/UPDATE users SET/i.test(sql)) {
      assert.match(sql, /session_version = session_version \+ 1/i);
      return { rows: [{ user_id: 4, full_name: 'Ada User' }] };
    }
    if (/INSERT INTO audit_logs/i.test(sql)) {
      return { rows: [] };
    }
    throw new Error(`unexpected SQL: ${sql}`);
  });

  const user = await updateStaffAccount(4, {
    full_name: 'Ada User',
    email: 'ada@nscict.local',
    role: 'staff',
    user_type: 'employee',
    department_id: 2,
    actorUserId: 1,
  }, executor);

  assert.equal(user.full_name, 'Ada User');
  assert.equal(queries.some((q) => /INSERT INTO audit_logs/i.test(q.sql)), true);
});

test('changeStaffStatus clears lockout on activation and bumps session version', async () => {
  const { executor } = createExecutor((sql) => {
    if (/UPDATE users/i.test(sql)) {
      assert.match(sql, /locked_until = CASE WHEN \$1 THEN NULL ELSE locked_until END/i);
      assert.match(sql, /session_version = session_version \+ 1/i);
      return { rows: [{ user_id: 5, full_name: 'Locked User', is_active: true }] };
    }
    if (/INSERT INTO audit_logs/i.test(sql)) {
      return { rows: [] };
    }
    throw new Error(`unexpected SQL: ${sql}`);
  });

  const user = await changeStaffStatus(5, {
    is_active: true,
    actorUserId: 1,
  }, executor);

  assert.equal(user.is_active, true);
});

test('extendTemporaryAccount reactivates account and clears login lockout', async () => {
  const { executor } = createExecutor((sql) => {
    if (/UPDATE users/i.test(sql)) {
      assert.match(sql, /is_active = TRUE/i);
      assert.match(sql, /failed_login_attempts = 0/i);
      assert.match(sql, /locked_until = NULL/i);
      return { rows: [{ user_id: 6, full_name: 'Temp User', is_active: true }] };
    }
    if (/INSERT INTO audit_logs/i.test(sql)) {
      return { rows: [] };
    }
    throw new Error(`unexpected SQL: ${sql}`);
  });

  const user = await extendTemporaryAccount(6, {
    account_expiration_date: '2026-12-31',
    actorUserId: 1,
  }, executor);

  assert.equal(user.is_active, true);
});
