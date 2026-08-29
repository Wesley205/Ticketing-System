const test = require('node:test');
const assert = require('node:assert/strict');

const constants = require('./maintenance.constants');
const mapper = require('./maintenance.mapper');
const policy = require('./maintenance.policy');
const repository = require('./maintenance.repository');
const routes = require('./maintenance.routes');
const service = require('./maintenance.service');

test('maintenance constants expose workflow and schedule domains', () => {
  assert.ok(constants.MAINTENANCE_STATUSES.includes('Scheduled'));
  assert.ok(constants.MAINTENANCE_STATUSES.includes('Completed'));
  assert.ok(constants.MAINTENANCE_TYPES.includes('Corrective'));
  assert.ok(constants.MAINTENANCE_SCHEDULE_TYPES.includes('Preventive'));
  assert.ok(constants.MAINTENANCE_FREQUENCY_UNITS.includes('months'));
});

test('maintenance mapper preserves existing raw API row shape', () => {
  const row = { maintenance_id: 4, asset_tag: 'ICT-LAP-004', technician_name: 'Ada' };
  assert.deepEqual(mapper.mapMaintenanceRow(row), row);
  assert.deepEqual(mapper.mapScheduleRow({ schedule_id: 7 }), { schedule_id: 7 });
});

test('maintenance repository builds visibility-scoped list queries', () => {
  const query = repository.buildMaintenanceListQuery(
    { asset_id: 3, status: 'Scheduled' },
    { clauses: ['a.department_id = $1'], params: [2] }
  );

  assert.match(query.sql, /FROM maintenance m/i);
  assert.match(query.sql, /JOIN assets a/i);
  assert.match(query.sql, /a\.department_id = \$1/i);
  assert.match(query.sql, /m\.asset_id = \$2/i);
  assert.match(query.sql, /m\.status = \$3/i);
  assert.deepEqual(query.params, [2, 3, 'Scheduled']);
});

test('maintenance repository builds schedule filters', () => {
  const query = repository.buildScheduleListQuery({ asset_id: 3, is_active: true });

  assert.match(query.sql, /FROM maintenance_schedules ms/i);
  assert.match(query.sql, /ms\.asset_id = \$1/i);
  assert.match(query.sql, /ms\.is_active = \$2/i);
  assert.deepEqual(query.params, [3, true]);
});

test('maintenance policy delegates technician visibility constraints', () => {
  const visibility = policy.buildMaintenanceVisibility({
    user_id: 12,
    role: 'technician',
    department_id: 2,
  });

  assert.deepEqual(visibility.params, [12, 2]);
  assert.match(visibility.clauses[0], /m\.technician_id = \$1 OR a\.department_id = \$2/i);
});

test('maintenance service keeps legacy pure workflow helpers available', () => {
  const nextByWeeks = service.calculateNextMaintenanceDueAt(
    { frequency_unit: 'weeks', frequency_value: 2 },
    new Date('2026-08-29T00:00:00Z')
  );

  assert.equal(nextByWeeks.toISOString(), '2026-09-12T00:00:00.000Z');
  assert.equal(service.resolveAssetStatusAfterMaintenance({ assigned_to: 3 }, { status: 'Completed' }), 'Assigned');
  assert.equal(service.resolveAssetStatusAfterMaintenance({ assigned_to: null }, { status: 'Cancelled' }), 'Available');
});

test('maintenance service filters schedules through authorization policy', async () => {
  const executor = {
    async query() {
      return {
        rows: [
          { schedule_id: 1, department_id: 2, assigned_to: null },
          { schedule_id: 2, department_id: 9, assigned_to: null },
        ],
      };
    },
  };

  const schedules = await service.listSchedulesForActor({}, {
    user_id: 14,
    role: 'technician',
    department_id: 2,
  }, executor);

  assert.deepEqual(schedules.map((schedule) => schedule.schedule_id), [1]);
});

test('maintenance router preserves the existing endpoint surface', () => {
  const routeSignatures = routes.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods).sort().join(',').toUpperCase()} ${layer.route.path}`);

  assert.deepEqual(routeSignatures, [
    'GET /',
    'GET /schedules',
    'POST /',
    'PUT /:id',
    'POST /schedules',
    'PUT /schedules/:id',
  ]);
});
