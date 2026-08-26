const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildFrontendAccessProfile,
  canManageKnowledgeBase,
  canViewKnowledgeBaseArticle,
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

test('knowledge-base visibility respects publication state and article scope', () => {
  const staff = { user_id: 9, role: 'staff', department_id: 4 };
  const technician = { user_id: 5, role: 'technician', department_id: 4 };

  assert.equal(canViewKnowledgeBaseArticle(staff, { status: 'published', visibility_scope: 'all_users' }), true);
  assert.equal(canViewKnowledgeBaseArticle(staff, { status: 'draft', visibility_scope: 'all_users' }), false);
  assert.equal(canViewKnowledgeBaseArticle(staff, { status: 'published', visibility_scope: 'operational_only' }), false);
  assert.equal(canViewKnowledgeBaseArticle(technician, { status: 'published', visibility_scope: 'operational_only' }), true);
  assert.equal(canViewKnowledgeBaseArticle(staff, { status: 'published', visibility_scope: 'department', department_id: 4 }), true);
  assert.equal(canManageKnowledgeBase({ user_id: 1, role: 'ict_officer' }), true);
});

test('frontend access profile exposes normalized scope and portal metadata', () => {
  const technicianProfile = buildFrontendAccessProfile({
    user_id: 4,
    role: 'technician',
    user_type: 'employee',
    department_id: 2,
  });
  const staffProfile = buildFrontendAccessProfile({
    user_id: 8,
    role: 'staff',
    user_type: 'employee',
    department_id: 5,
  });

  assert.equal(technicianProfile.primary_portal, 'technician');
  assert.equal(technicianProfile.scope.assigned_only, true);
  assert.equal(technicianProfile.permissions.can_access_technician_portal, true);
  assert.equal(technicianProfile.permissions.can_view_reports, false);

  assert.equal(staffProfile.primary_portal, 'department_supervisor');
  assert.equal(staffProfile.scope.department_scope, true);
  assert.equal(staffProfile.scope.user_only, true);
  assert.equal(staffProfile.permissions.can_manage_assets, false);
});
