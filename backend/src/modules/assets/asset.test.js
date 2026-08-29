const test = require('node:test');
const assert = require('node:assert/strict');

const constants = require('./asset.constants');
const mapper = require('./asset.mapper');
const policy = require('./asset.policy');
const repository = require('./asset.repository');
const routes = require('./asset.routes');
const service = require('./asset.service');

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
      async query(sql, params = []) {
        queries.push({ sql, params });
        return handler(sql, params);
      },
    },
  };
}

test('asset constants expose database-backed statuses and return conditions', () => {
  assert.ok(constants.ASSET_STATUSES.includes('Available'));
  assert.ok(constants.ASSET_STATUSES.includes('Under Maintenance'));
  assert.ok(constants.ASSET_RETURN_CONDITIONS.includes('Damaged'));
  assert.equal(constants.ASSET_RETURN_CONDITIONS.includes('New'), false);
});

test('asset mapper preserves route-compatible asset detail shape', () => {
  const detail = mapper.mapAssetDetail({
    asset: { asset_id: 3, asset_tag: 'ICT-LAP-003' },
    maintenanceHistory: [{ maintenance_id: 1 }],
    assignmentHistory: [{ assignment_id: 2 }],
    statusHistory: [{ asset_status_history_id: 4 }],
    linkedTickets: [{ request_id: 5 }],
  });

  assert.equal(detail.asset_tag, 'ICT-LAP-003');
  assert.equal(detail.maintenance_history.length, 1);
  assert.equal(detail.assignment_history.length, 1);
  assert.equal(detail.status_history.length, 1);
  assert.equal(detail.linked_tickets.length, 1);
});

test('asset repository builds scoped list queries without route SQL', () => {
  const query = repository.buildAssetListQuery(
    { search: 'dell', status: 'Available', asset_type: 'Laptop', department_id: 2 },
    { clauses: ['a.department_id = $1'], params: [2] }
  );

  assert.match(query.sql, /FROM assets a/i);
  assert.match(query.sql, /LEFT JOIN departments d/i);
  assert.match(query.sql, /a\.department_id = \$1/i);
  assert.match(query.sql, /a\.status = \$3/i);
  assert.match(query.sql, /a\.asset_type = \$4/i);
  assert.deepEqual(query.params, [2, '%dell%', 'Available', 'Laptop', 2]);
});

test('asset policy restricts delete to administrators with asset management rights', () => {
  assert.equal(policy.canDeleteAsset({ role: 'admin', user_id: 1 }), true);
  assert.equal(policy.canDeleteAsset({ role: 'ict_officer', user_id: 2 }), false);
});

test('asset service assigns assets transactionally and writes history and audit rows', async () => {
  const { executor, queries } = createExecutor((sql) => {
    if (/SELECT asset_id, asset_tag, department_id, assigned_to, status, condition/i.test(sql)) {
      return { rows: [{ asset_id: 7, asset_tag: 'ICT-LAP-007', department_id: 1, assigned_to: null, status: 'Available' }] };
    }
    if (/UPDATE asset_assignments/i.test(sql)) {
      return { rows: [] };
    }
    if (/INSERT INTO asset_assignments/i.test(sql)) {
      return { rows: [] };
    }
    if (/UPDATE assets\s+SET assigned_to/i.test(sql)) {
      return { rows: [{ asset_id: 7, asset_tag: 'ICT-LAP-007', assigned_to: 12, status: 'Assigned' }] };
    }
    if (/INSERT INTO asset_status_history/i.test(sql)) {
      return { rows: [] };
    }
    if (/INSERT INTO audit_logs/i.test(sql)) {
      return { rows: [] };
    }
    throw new Error(`unexpected SQL: ${sql}`);
  });

  const asset = await service.assignAssetRecord(7, 12, 1, { assignment_notes: 'Issued for field work' }, executor);

  assert.equal(asset.status, 'Assigned');
  assert.equal(queries.some((query) => /INSERT INTO asset_assignments/i.test(query.sql)), true);
  assert.equal(queries.some((query) => /INSERT INTO asset_status_history/i.test(query.sql)), true);
  assert.equal(queries.some((query) => /INSERT INTO audit_logs/i.test(query.sql)), true);
  assert.deepEqual(queries.filter((query) => ['BEGIN', 'COMMIT', 'RELEASE'].includes(query.sql)).map((query) => query.sql), [
    'BEGIN',
    'COMMIT',
    'RELEASE',
  ]);
});

test('asset service rejects inactive assigned users before assignment transaction', async () => {
  const { queries, executor } = createExecutor((sql) => {
    if (/SELECT user_id, is_active FROM users/i.test(sql)) {
      return { rows: [{ user_id: 15, is_active: false }] };
    }
    throw new Error(`unexpected SQL: ${sql}`);
  });

  await assert.rejects(
    () => service.assignAssetForActor(7, 15, { user_id: 1 }, {}, executor),
    /Assigned user must be an active account/
  );
  assert.equal(queries.some((query) => query.sql === 'BEGIN'), false);
});

test('asset router preserves the existing endpoint surface', () => {
  const routeSignatures = routes.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods).sort().join(',').toUpperCase()} ${layer.route.path}`);

  assert.deepEqual(routeSignatures, [
    'GET /',
    'GET /:id',
    'POST /',
    'PUT /:id',
    'PATCH /:id/status',
    'PATCH /:id/assign',
    'PATCH /:id/return',
    'DELETE /:id',
  ]);
});
