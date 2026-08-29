const test = require("node:test");
const assert = require("node:assert/strict");

const { PERMISSIONS } = require("../src/authorization/permissions");
const {
  getUserPermissions,
  hasPermission,
  isActiveUser,
  isExpiredTemporaryUser,
} = require("../src/authorization/policy");
const {
  canAssignTicket,
  canCreateTicket,
  canDeleteAsset,
  canViewAsset,
  canViewNotification,
  canViewReports,
  canViewTicket,
  canViewTicketAttachment,
} = require("../src/authorization/resourceAccess");

const activeAdmin = {
  user_id: 1,
  role: "admin",
  user_type: "employee",
  department_id: 10,
  is_active: true,
  account_status: "active",
};

const activeIctOfficer = {
  user_id: 2,
  role: "ict_officer",
  user_type: "employee",
  department_id: 10,
  is_active: true,
  account_status: "active",
};

const activeTechnician = {
  user_id: 3,
  role: "technician",
  user_type: "employee",
  department_id: 10,
  is_active: true,
  account_status: "active",
};

const activeStaff = {
  user_id: 4,
  role: "staff",
  user_type: "employee",
  department_id: 10,
  is_active: true,
  account_status: "active",
};

test("role mappings expose explicit permissions", () => {
  assert.equal(hasPermission(activeAdmin, PERMISSIONS.USERS_CHANGE_ROLE), true);
  assert.equal(hasPermission(activeIctOfficer, PERMISSIONS.TICKETS_ASSIGN), true);
  assert.equal(hasPermission(activeTechnician, PERMISSIONS.TICKETS_ASSIGN), false);
  assert.equal(hasPermission(activeStaff, PERMISSIONS.REPORTS_VIEW), false);
  assert.deepEqual(
    getUserPermissions(activeStaff).sort(),
    [
      PERMISSIONS.TICKETS_CLOSE,
      PERMISSIONS.TICKETS_CREATE,
      PERMISSIONS.TICKETS_REOPEN,
      PERMISSIONS.TICKETS_VIEW_OWN,
    ].sort(),
  );
});

test("inactive, suspended, and expired temporary users receive no permissions", () => {
  assert.equal(isActiveUser({ ...activeStaff, is_active: false }), false);
  assert.equal(isActiveUser({ ...activeStaff, account_status: "suspended" }), false);
  assert.equal(isExpiredTemporaryUser({
    ...activeStaff,
    user_type: "contractor",
    account_expiration_date: "2020-01-01T00:00:00.000Z",
  }), true);
  assert.equal(hasPermission({ ...activeAdmin, account_status: "deactivated" }, PERMISSIONS.REPORTS_VIEW), false);
});

test("staff cannot view another user's ticket", () => {
  const ownTicket = { request_id: 11, requester_id: 4, department_id: 10 };
  const otherTicket = { request_id: 12, requester_id: 99, department_id: 10 };

  assert.equal(canViewTicket(activeStaff, ownTicket), true);
  assert.equal(canViewTicket(activeStaff, otherTicket), false);
});

test("technicians can view assigned tickets but not unassigned tickets", () => {
  const assignedTicket = {
    request_id: 20,
    requester_id: 4,
    department_id: 10,
    assigned_technician_id: 3,
  };
  const unassignedTicket = {
    request_id: 21,
    requester_id: 4,
    department_id: 10,
    assigned_technician_id: null,
  };

  assert.equal(canViewTicket(activeTechnician, assignedTicket), true);
  assert.equal(canViewTicket(activeTechnician, unassignedTicket), false);
});

test("asset visibility is scoped by assignment or department for non-operational users", () => {
  const departmentAsset = { asset_id: 1, department_id: 10, assigned_to: null };
  const assignedAsset = { asset_id: 2, department_id: 30, assigned_to: 4 };
  const otherDepartmentAsset = { asset_id: 3, department_id: 30, assigned_to: 99 };

  assert.equal(canViewAsset(activeStaff, departmentAsset), true);
  assert.equal(canViewAsset(activeStaff, assignedAsset), true);
  assert.equal(canViewAsset(activeStaff, otherDepartmentAsset), false);
  assert.equal(canViewAsset(activeIctOfficer, otherDepartmentAsset), true);
});

test("notifications are only accessible by the owning user", () => {
  assert.equal(canViewNotification(activeStaff, { notification_id: 1, user_id: 4 }), true);
  assert.equal(canViewNotification(activeStaff, { notification_id: 2, user_id: 99 }), false);
});

test("reports, ticket assignment, and asset deletion require elevated permissions", () => {
  assert.equal(canViewReports(activeStaff), false);
  assert.equal(canViewReports(activeIctOfficer), true);
  assert.equal(canAssignTicket(activeTechnician), false);
  assert.equal(canAssignTicket(activeIctOfficer), true);
  assert.equal(canDeleteAsset(activeIctOfficer), false);
  assert.equal(canDeleteAsset(activeAdmin), true);
});

test("ticket creation is limited to permitted department scope", () => {
  assert.equal(canCreateTicket(activeStaff, 10), true);
  assert.equal(canCreateTicket(activeStaff, 99), false);
  assert.equal(canCreateTicket(activeIctOfficer, 99), true);
});

test("attachment access follows ticket visibility and internal-artifact restrictions", () => {
  const ownTicket = { request_id: 30, requester_id: 4, department_id: 10 };
  const assignedTicket = {
    request_id: 31,
    requester_id: 4,
    department_id: 10,
    assigned_technician_id: 3,
  };
  const publicAttachment = { attachment_id: 1, request_id: 30, is_internal: false };
  const internalAttachment = { attachment_id: 2, request_id: 30, is_internal: true };
  const assignedInternalAttachment = { attachment_id: 3, request_id: 31, is_internal: true };

  assert.equal(canViewTicketAttachment(activeStaff, ownTicket, publicAttachment), true);
  assert.equal(canViewTicketAttachment(activeStaff, ownTicket, internalAttachment), false);
  assert.equal(canViewTicketAttachment(activeTechnician, assignedTicket, assignedInternalAttachment), true);
  assert.equal(canViewTicketAttachment(activeTechnician, ownTicket, internalAttachment), false);
});
