const test = require('node:test');
const assert = require('node:assert/strict');

const mapper = require('./dashboard.mapper');
const policy = require('./dashboard.policy');
const repository = require('./dashboard.repository');
const routes = require('./dashboard.routes');
const service = require('./dashboard.service');

test('dashboard policy scopes staff tickets to requester', () => {
  const clauses = [];
  const params = [];
  policy.applyTicketScope({ user_id: 12, role: 'staff' }, { clauses, params, alias: 'sr' });
  assert.deepEqual(params, [12]);
  assert.match(clauses[0], /sr\.requester_id/);
});

test('dashboard policy scopes technician maintenance to technician or department', () => {
  const clauses = [];
  const params = [];
  policy.applyMaintenanceScope(
    { user_id: 7, role: 'technician', department_id: 3 },
    { clauses, params, maintenanceAlias: 'm', assetAlias: 'a' }
  );
  assert.deepEqual(params, [7, 3]);
  assert.match(clauses[0], /m\.technician_id/);
  assert.match(clauses[0], /a\.department_id/);
});

test('dashboard repository builds scoped ticket where clause', () => {
  const scope = repository.buildTicketScope(
    { category: 'Network' },
    ({ clauses, params, alias }) => {
      params.push(99);
      clauses.push(`${alias}.requester_id = $${params.length}`);
    }
  );

  assert.match(scope.where, /WHERE/);
  assert.match(scope.where, /sr\.category/);
  assert.match(scope.where, /sr\.requester_id/);
  assert.deepEqual(scope.params, ['Network', 99]);
});

test('dashboard mapper preserves stats response shape', () => {
  const mapped = mapper.mapDashboardStats({
    filters: {},
    ticketMetrics: { total_requests: '2', response_sla_measured: '0', resolution_sla_measured: '0' },
    assetMetrics: { total_assets: '4' },
    maintenanceMetrics: { total_records: '1', total_cost: '2500' },
    accessMetrics: { pending_invitations: '2', active_accounts: '7', access_anomalies: '1', active_departments: '3' },
    ticketStatusRows: [],
    ticketPriorityRows: [],
    assetStatusRows: [],
    technicianRows: [],
  });

  assert.equal(mapped.total_requests, 2);
  assert.equal(mapped.total_assets, 4);
  assert.equal(mapped.maintenance_total_cost, 2500);
  assert.equal(mapped.pending_invitations, 2);
  assert.equal(mapped.active_accounts, 7);
  assert.equal(mapped.access_anomalies, 1);
  assert.equal(mapped.active_departments, 3);
  assert.equal(mapped.response_sla_met, 0);
  assert.equal(mapped.response_sla_measured, 0);
  assert.equal(mapped.resolution_sla_met, 0);
  assert.equal(mapped.resolution_sla_measured, 0);
  assert.equal(mapped.response_sla_met_rate, null);
  assert.ok(Array.isArray(mapped.tickets_by_status));
});

test('dashboard routes preserve endpoint surface', () => {
  const endpoints = routes.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);

  assert.deepEqual(endpoints, ['GET /stats']);
});

test('dashboard service applies non-global user scope while parsing filters', () => {
  const filters = service.parseDashboardFilters(
    { user_id: 8, role: 'technician', department_id: 2 },
    { department_id: '9', technician_id: '4' }
  );

  assert.equal(filters.department_id, 2);
  assert.equal(filters.technician_id, 8);
});
