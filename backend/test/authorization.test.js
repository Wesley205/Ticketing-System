const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canManageAssets,
  canManageDepartments,
  canUpdateServiceRequest,
  canViewAsset,
  canViewDepartment,
  canViewServiceRequest,
  constrainAssetVisibility,
  constrainServiceRequestVisibility,
} = require('../src/utils/authorization');

test('service request visibility is limited by assignment and requester', () => {
  const staffUser = { user_id: 7, role: 'staff', department_id: 2 };
  const techUser = { user_id: 4, role: 'technician', department_id: 1 };
  const request = { requester_id: 7, assigned_technician_id: 4 };

  assert.equal(canViewServiceRequest(staffUser, request), true);
  assert.equal(canViewServiceRequest(techUser, request), true);
  assert.equal(canUpdateServiceRequest(techUser, request), true);
  assert.equal(canUpdateServiceRequest({ user_id: 9, role: 'technician', department_id: 1 }, request), false);
});

test('asset visibility is constrained for non-operational roles', () => {
  const user = { user_id: 8, role: 'staff', department_id: 3 };
  const visibleAsset = { asset_id: 1, department_id: 3, assigned_to: null };
  const hiddenAsset = { asset_id: 2, department_id: 5, assigned_to: 11 };

  assert.equal(canViewAsset(user, visibleAsset), true);
  assert.equal(canViewAsset(user, hiddenAsset), false);
  assert.equal(canManageAssets(user), false);
});

test('department access is department-scoped for non-admin users', () => {
  const user = { user_id: 10, role: 'staff', department_id: 5 };
  assert.equal(canViewDepartment(user, 5), true);
  assert.equal(canViewDepartment(user, 2), false);
  assert.equal(canManageDepartments(user), false);
});

test('query scope helpers add restrictive clauses for non-admin roles', () => {
  const requestClauses = [];
  const requestParams = [];
  constrainServiceRequestVisibility(
    { user_id: 3, role: 'technician', department_id: 1 },
    { clauses: requestClauses, params: requestParams, alias: 'sr', mine: false }
  );

  const assetClauses = [];
  const assetParams = [];
  constrainAssetVisibility(
    { user_id: 3, role: 'staff', department_id: 1 },
    { clauses: assetClauses, params: assetParams, alias: 'a' }
  );

  assert.match(requestClauses[0], /assigned_technician_id/);
  assert.match(assetClauses[0], /assigned_to/);
  assert.equal(requestParams[0], 3);
  assert.equal(assetParams[0], 3);
});
