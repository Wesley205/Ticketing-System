const PERMISSIONS = Object.freeze({
  TICKETS_CREATE: "tickets.create",
  TICKETS_VIEW_OWN: "tickets.view_own",
  TICKETS_VIEW_DEPARTMENT: "tickets.view_department",
  TICKETS_VIEW_ALL: "tickets.view_all",
  TICKETS_ASSIGN: "tickets.assign",
  TICKETS_UPDATE_STATUS: "tickets.update_status",
  TICKETS_CLOSE: "tickets.close",
  TICKETS_REOPEN: "tickets.reopen",

  ASSETS_CREATE: "assets.create",
  ASSETS_EDIT: "assets.edit",
  ASSETS_ASSIGN: "assets.assign",
  ASSETS_DELETE: "assets.delete",

  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DEACTIVATE: "users.deactivate",
  USERS_CHANGE_ROLE: "users.change_role",

  REPORTS_VIEW: "reports.view",
  AUDIT_LOGS_VIEW: "audit_logs.view",
});

const ALL_PERMISSIONS = Object.freeze(Object.values(PERMISSIONS));

function isKnownPermission(permission) {
  return ALL_PERMISSIONS.includes(permission);
}

module.exports = {
  ALL_PERMISSIONS,
  PERMISSIONS,
  isKnownPermission,
};
