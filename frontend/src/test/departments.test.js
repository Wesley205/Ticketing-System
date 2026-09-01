import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterDepartmentsBySearch,
  normalizeDepartmentDetail,
  normalizeDepartmentPayload,
  normalizeDepartmentRow,
} from '../features/departments/services/departments-api.js';
import { buildAccessProfile, canAccessRoute } from '../permissions/access.js';

test('department row normalizer converts count fields to numbers', () => {
  const row = normalizeDepartmentRow({
    department_id: 1,
    name: 'Finance',
    staff_count: '3',
    asset_count: '4',
    request_count: '5',
  });

  assert.equal(row.staff_count, 3);
  assert.equal(row.asset_count, 4);
  assert.equal(row.request_count, 5);
});

test('department detail normalizer supplies safe arrays', () => {
  const detail = normalizeDepartmentDetail({ department_id: 2, name: 'ICT' });

  assert.deepEqual(detail.staff, []);
  assert.deepEqual(detail.assets, []);
  assert.deepEqual(detail.service_requests, []);
});

test('department payload normalization preserves backend field names', () => {
  const payload = normalizeDepartmentPayload({
    name: ' Legal ',
    description: ' Advisory services ',
  });

  assert.deepEqual(payload, {
    name: 'Legal',
    description: 'Advisory services',
  });
});

test('department search matches name, description, and count text', () => {
  const departments = [
    { name: 'Finance', description: 'Payments', staff_count: 4, asset_count: 2, request_count: 1 },
    { name: 'ICT', description: 'Infrastructure', staff_count: 8, asset_count: 20, request_count: 12 },
  ];

  assert.deepEqual(filterDepartmentsBySearch(departments, 'infra'), [departments[1]]);
  assert.deepEqual(filterDepartmentsBySearch(departments, '4'), [departments[0]]);
});

test('department route is visible to authenticated scoped users while management remains separate', () => {
  const staffProfile = buildAccessProfile({ user_id: 9, role: 'staff', department_id: 4 });
  const adminProfile = buildAccessProfile({ user_id: 1, role: 'admin', department_id: 1 });

  assert.equal(canAccessRoute(staffProfile, '/departments'), true);
  assert.equal(staffProfile.permissions.can_manage_departments, false);
  assert.equal(canAccessRoute(adminProfile, '/departments'), true);
  assert.equal(adminProfile.permissions.can_manage_departments, true);
});
