const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveReturnedAssetStatus,
} = require('../src/modules/assets/asset.service');
const {
  calculateNextMaintenanceDueAt,
  resolveAssetStatusAfterMaintenance,
} = require('../src/modules/maintenance/maintenance.service');

test('resolveReturnedAssetStatus defaults poor returns to damaged', () => {
  assert.equal(resolveReturnedAssetStatus({ returned_condition: 'Poor' }), 'Damaged');
  assert.equal(resolveReturnedAssetStatus({ returned_condition: 'Good' }), 'Available');
  assert.equal(resolveReturnedAssetStatus({ target_status: 'Retired', returned_condition: 'Good' }), 'Retired');
});

test('calculateNextMaintenanceDueAt advances according to schedule frequency', () => {
  const nextByDays = calculateNextMaintenanceDueAt(
    { frequency_unit: 'days', frequency_value: 14 },
    new Date('2026-08-25T00:00:00Z')
  );
  const nextByMonths = calculateNextMaintenanceDueAt(
    { frequency_unit: 'months', frequency_value: 1 },
    new Date('2026-08-25T00:00:00Z')
  );

  assert.equal(nextByDays.toISOString(), '2026-09-08T00:00:00.000Z');
  assert.equal(nextByMonths.toISOString(), '2026-09-25T00:00:00.000Z');
});

test('resolveAssetStatusAfterMaintenance restores assignment-aware states', () => {
  assert.equal(
    resolveAssetStatusAfterMaintenance({ assigned_to: 17 }, { status: 'Completed' }),
    'Assigned'
  );
  assert.equal(
    resolveAssetStatusAfterMaintenance({ assigned_to: null }, { status: 'Completed' }),
    'Available'
  );
  assert.equal(
    resolveAssetStatusAfterMaintenance({ assigned_to: null }, { status: 'In Progress' }),
    'Under Maintenance'
  );
});
