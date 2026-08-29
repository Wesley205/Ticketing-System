const test = require('node:test');
const assert = require('node:assert/strict');

const constants = require('./report.constants');
const mapper = require('./report.mapper');
const policy = require('./report.policy');
const repository = require('./report.repository');
const routes = require('./report.routes');
const service = require('./report.service');

test('report module parses filters and pagination consistently', () => {
  const filters = service.parseReportFilters({
    date_from: '2026-08-01',
    date_to: '2026-08-15',
    department_id: '4',
    technician_id: '9',
    category: 'Network',
    ticket_type: 'Incident',
    page: '2',
    page_size: '10',
  });

  assert.equal(filters.department_id, 4);
  assert.equal(filters.technician_id, 9);
  assert.equal(filters.category, 'Network');
  assert.equal(filters.ticket_type, 'Incident');
  assert.equal(filters.page, 2);
  assert.equal(filters.page_size, 10);
  assert.equal(filters.offset, 10);
});

test('report module rejects inverted date ranges', () => {
  assert.throws(
    () => service.parseReportFilters({ date_from: '2026-08-20', date_to: '2026-08-01' }),
    /date_from cannot be after date_to/i
  );
});

test('report policy requires report permission', () => {
  assert.equal(policy.canAccessReports({ user_id: 1, role: 'admin', is_active: true, account_status: 'active' }), true);
  assert.equal(policy.canAccessReports({ user_id: 2, role: 'staff', is_active: true, account_status: 'active' }), false);
});

test('report mapper escapes CSV values', () => {
  const csv = mapper.toCsv(['Name', 'Note'], [['Asset "A"', 'Line, one']]);
  assert.equal(csv, '"Name","Note"\n"Asset ""A""","Line, one"');
});

test('report routes preserve endpoint surface', () => {
  const endpoints = routes.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);

  assert.ok(endpoints.includes('GET /filters'));
  assert.ok(endpoints.includes('GET /summary'));
  assert.ok(endpoints.includes('GET /tickets'));
  assert.ok(endpoints.includes('GET /assets'));
  assert.ok(endpoints.includes('GET /maintenance'));
  assert.ok(endpoints.includes('GET /export/assets.csv'));
  assert.ok(endpoints.includes('GET /export/service-requests.csv'));
});

test('report repository fetches filter metadata without exposing inactive technicians', async () => {
  const calls = [];
  const executor = {
    async query(sql) {
      calls.push(sql);
      return { rows: [] };
    },
  };

  const result = await repository.getReportFilters(executor);
  assert.deepEqual(result, { departments: [], technicians: [] });
  assert.match(calls[0], /FROM departments/i);
  assert.match(calls[1], /role = 'technician' AND is_active = TRUE/i);
});

test('report constants expose frontend filter options', () => {
  assert.ok(constants.TICKET_CATEGORIES.includes('Network'));
  assert.ok(constants.TICKET_TYPES.includes('Maintenance Request'));
});
