import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMaintenanceQuery,
  buildScheduleQuery,
  filterMaintenanceBySearch,
  filterSchedulesBySearch,
  getChecklistItems,
  normalizeMaintenancePayload,
  normalizeSchedulePayload,
  parseChecklist,
} from '../features/maintenance/services/maintenance-api.js';

test('maintenance query builder preserves supported backend filters only', () => {
  const query = buildMaintenanceQuery({
    asset_id: 7,
    status: 'In Progress',
    search: 'ups',
    unsafe: 'ignored',
  });

  assert.equal(query.toString(), 'asset_id=7&status=In+Progress');
});

test('maintenance schedule query builder preserves supported backend filters only', () => {
  const query = buildScheduleQuery({
    asset_id: 3,
    is_active: 'true',
    search: 'printer',
  });

  assert.equal(query.toString(), 'asset_id=3&is_active=true');
});

test('maintenance checklist helpers parse strings, arrays, and JSON payloads', () => {
  assert.deepEqual(parseChecklist('Clean fan, verify UPS, inspect ports'), ['Clean fan', 'verify UPS', 'inspect ports']);
  assert.deepEqual(parseChecklist([' Clean fan ', '', 'Inspect']), ['Clean fan', 'Inspect']);
  assert.deepEqual(getChecklistItems({ checklist_json: '["Clean fan","Inspect"]' }), ['Clean fan', 'Inspect']);
  assert.deepEqual(getChecklistItems({ checklist_json: 'not-json' }), []);
});

test('maintenance search matches asset, problem, status, and technician text', () => {
  const rows = [
    { asset_tag: 'NSC-LAP-001', problem: 'Battery issue', status: 'Scheduled', technician_name: 'Ada' },
    { asset_tag: 'NSC-UPS-009', problem: 'Runtime test', status: 'Completed', technician_name: 'Bala' },
  ];

  assert.deepEqual(filterMaintenanceBySearch(rows, 'ups'), [rows[1]]);
  assert.deepEqual(filterMaintenanceBySearch(rows, 'ada'), [rows[0]]);
});

test('schedule search matches title, asset, type, and technician text', () => {
  const schedules = [
    { title: 'Quarterly laptop service', asset_tag: 'NSC-LAP-001', maintenance_type: 'Preventive', technician_name: 'Ada' },
    { title: 'Switch inspection', asset_tag: 'NSC-SW-002', maintenance_type: 'Inspection', technician_name: 'Bala' },
  ];

  assert.deepEqual(filterSchedulesBySearch(schedules, 'inspection'), [schedules[1]]);
  assert.deepEqual(filterSchedulesBySearch(schedules, 'quarterly'), [schedules[0]]);
});

test('maintenance payload normalization preserves backend field names', () => {
  const payload = normalizeMaintenancePayload({
    asset_id: '5',
    problem: ' Dust buildup ',
    checklist_items: 'Clean fan, test boot',
    status: 'Completed',
    cost: '2500',
    asset_status_override: 'Available',
  });

  assert.equal(payload.asset_id, '5');
  assert.equal(payload.problem, 'Dust buildup');
  assert.equal(payload.status, 'Completed');
  assert.equal(payload.cost, '2500');
  assert.equal(payload.asset_status_override, 'Available');
  assert.deepEqual(payload.checklist_items, ['Clean fan', 'test boot']);
});

test('schedule payload normalization handles booleans and numeric fields', () => {
  const payload = normalizeSchedulePayload({
    asset_id: '8',
    title: ' Monthly UPS check ',
    frequency_value: '2',
    reminder_days_before: '5',
    is_active: 'false',
    checklist_items: 'Inspect battery',
  });

  assert.equal(payload.title, 'Monthly UPS check');
  assert.equal(payload.frequency_value, 2);
  assert.equal(payload.reminder_days_before, 5);
  assert.equal(payload.is_active, false);
  assert.deepEqual(payload.checklist_items, ['Inspect battery']);
});
