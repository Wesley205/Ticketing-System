const test = require('node:test');
const assert = require('node:assert/strict');

const mapper = require('./department.mapper');
const policy = require('./department.policy');
const repository = require('./department.repository');
const routes = require('./department.routes');
const service = require('./department.service');

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

test('department mapper normalizes aggregate count fields', () => {
  const mapped = mapper.mapDepartmentRow({
    department_id: 2,
    name: 'Finance',
    staff_count: '3',
    asset_count: '7',
    request_count: '11',
  });

  assert.equal(mapped.staff_count, 3);
  assert.equal(mapped.asset_count, 7);
  assert.equal(mapped.request_count, 11);
});

test('department policy scopes non-operational users to their department', () => {
  const scope = policy.buildDepartmentListScope({
    user_id: 9,
    role: 'staff',
    department_id: 4,
  });

  assert.equal(scope.can_view_all_operational_data, false);
  assert.equal(scope.department_id, 4);
});

test('department repository builds scoped list queries without route logic', () => {
  const scoped = repository.buildDepartmentListQuery({
    can_view_all_operational_data: false,
    department_id: 3,
  });
  const full = repository.buildDepartmentListQuery({
    can_view_all_operational_data: true,
    department_id: 3,
  });

  assert.match(scoped.sql, /WHERE d\.department_id = \$1/i);
  assert.deepEqual(scoped.params, [3]);
  assert.doesNotMatch(full.sql, /WHERE d\.department_id/i);
  assert.deepEqual(full.params, []);
});

test('department service preserves createDepartment transaction and audit behavior', async () => {
  const { executor, queries } = createExecutor((sql) => {
    if (/INSERT INTO departments/i.test(sql)) {
      return { rows: [{ department_id: 7, name: 'Operations' }] };
    }
    if (/INSERT INTO audit_logs/i.test(sql)) {
      return { rows: [] };
    }
    throw new Error(`unexpected SQL: ${sql}`);
  });

  const department = await service.createDepartment({
    name: 'Operations',
    description: 'Ops team',
    actorUserId: 1,
  }, executor);

  assert.equal(department.department_id, 7);
  assert.deepEqual(queries.map((query) => (
    query.sql === 'BEGIN' || query.sql === 'COMMIT' || query.sql === 'RELEASE' ? query.sql : 'SQL'
  )), ['BEGIN', 'SQL', 'SQL', 'COMMIT', 'RELEASE']);
});

test('department service enforces record-level detail access', async () => {
  await assert.rejects(
    () => service.getDepartmentDetails(5, { user_id: 9, role: 'staff', department_id: 4 }, {
      async query() {
        throw new Error('query should not run for forbidden access');
      },
    }),
    /You do not have permission to view this department/
  );
});

test('department router preserves the existing endpoint surface', () => {
  const routeSignatures = routes.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods).sort().join(',').toUpperCase()} ${layer.route.path}`);

  assert.deepEqual(routeSignatures, [
    'GET /',
    'GET /:id',
    'POST /',
    'PUT /:id',
  ]);
});
