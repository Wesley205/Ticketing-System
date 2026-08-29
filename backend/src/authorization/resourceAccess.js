const { PERMISSIONS } = require("./permissions");
const { hasPermission, hasRole } = require("./policy");
const { ROLES } = require("./roles");

function sameId(left, right) {
  return left != null && right != null && Number(left) === Number(right);
}

function sameDepartment(user, resource) {
  return Boolean(user?.department_id) && sameId(user.department_id, resource?.department_id);
}

function assignedTechnicianId(ticket) {
  return ticket?.assigned_technician_id ?? ticket?.assigned_to ?? null;
}

function canViewTicket(user, ticket) {
  if (!ticket) return false;
  if (hasPermission(user, PERMISSIONS.TICKETS_VIEW_ALL)) return true;
  if (
    hasPermission(user, PERMISSIONS.TICKETS_VIEW_DEPARTMENT) &&
    sameDepartment(user, ticket)
  ) {
    return true;
  }
  if (
    hasPermission(user, PERMISSIONS.TICKETS_VIEW_OWN) &&
    sameId(ticket.requester_id, user?.user_id)
  ) {
    return true;
  }
  return hasRole(user, ROLES.TECHNICIAN) && sameId(assignedTechnicianId(ticket), user?.user_id);
}

function canCreateTicket(user, departmentId) {
  if (!hasPermission(user, PERMISSIONS.TICKETS_CREATE)) return false;
  if (!departmentId) return true;
  if (hasPermission(user, PERMISSIONS.TICKETS_VIEW_ALL)) return true;
  return sameId(user?.department_id, departmentId);
}

function canAssignTicket(user) {
  return hasPermission(user, PERMISSIONS.TICKETS_ASSIGN);
}

function canUpdateTicketStatus(user, ticket) {
  if (!ticket) return false;
  if (!hasPermission(user, PERMISSIONS.TICKETS_UPDATE_STATUS)) return false;
  if (hasPermission(user, PERMISSIONS.TICKETS_VIEW_ALL)) return true;
  return hasRole(user, ROLES.TECHNICIAN) && sameId(assignedTechnicianId(ticket), user?.user_id);
}

function canCloseTicket(user, ticket) {
  if (!ticket) return false;
  if (!hasPermission(user, PERMISSIONS.TICKETS_CLOSE)) return false;
  if (hasPermission(user, PERMISSIONS.TICKETS_VIEW_ALL)) return true;
  return sameId(ticket.requester_id, user?.user_id) ||
    (hasRole(user, ROLES.TECHNICIAN) && sameId(assignedTechnicianId(ticket), user?.user_id));
}

function canReopenTicket(user, ticket) {
  if (!ticket) return false;
  if (!hasPermission(user, PERMISSIONS.TICKETS_REOPEN)) return false;
  if (hasPermission(user, PERMISSIONS.TICKETS_VIEW_ALL)) return true;
  return sameId(ticket.requester_id, user?.user_id) ||
    (hasRole(user, ROLES.TECHNICIAN) && sameId(assignedTechnicianId(ticket), user?.user_id));
}

function canCommentOnTicket(user, ticket) {
  return canViewTicket(user, ticket);
}

function canViewInternalTicketArtifacts(user, ticket) {
  if (!ticket) return false;
  if (hasPermission(user, PERMISSIONS.TICKETS_VIEW_ALL)) return true;
  return hasRole(user, ROLES.TECHNICIAN) && sameId(assignedTechnicianId(ticket), user?.user_id);
}

function canManageTicketAttachments(user, ticket) {
  return canCommentOnTicket(user, ticket);
}

function canAddInternalTicketContent(user) {
  return hasPermission(user, PERMISSIONS.TICKETS_VIEW_ALL) ||
    hasRole(user, ROLES.TECHNICIAN);
}

function canViewTicketAttachment(user, ticket, attachment) {
  if (!attachment || attachment.deleted_at) return false;
  if (!sameId(attachment.request_id, ticket?.request_id)) return false;
  if (!canViewTicket(user, ticket)) return false;
  if (attachment.is_internal) {
    return canViewInternalTicketArtifacts(user, ticket);
  }
  return true;
}

function canViewAsset(user, asset) {
  if (!asset) return false;
  if (hasPermission(user, PERMISSIONS.ASSETS_CREATE) || hasPermission(user, PERMISSIONS.ASSETS_ASSIGN)) {
    return true;
  }
  if (sameId(asset.assigned_to, user?.user_id)) return true;
  return sameDepartment(user, asset);
}

function canCreateAsset(user) {
  return hasPermission(user, PERMISSIONS.ASSETS_CREATE);
}

function canEditAsset(user, asset) {
  if (!asset) return false;
  if (!hasPermission(user, PERMISSIONS.ASSETS_EDIT)) return false;
  if (hasPermission(user, PERMISSIONS.ASSETS_ASSIGN)) return true;
  return canViewAsset(user, asset);
}

function canAssignAsset(user) {
  return hasPermission(user, PERMISSIONS.ASSETS_ASSIGN);
}

function canDeleteAsset(user) {
  return hasPermission(user, PERMISSIONS.ASSETS_DELETE);
}

function canViewNotification(user, notification) {
  return Boolean(notification) && sameId(notification.user_id, user?.user_id);
}

function canViewReports(user) {
  return hasPermission(user, PERMISSIONS.REPORTS_VIEW);
}

function canViewAuditLogs(user) {
  return hasPermission(user, PERMISSIONS.AUDIT_LOGS_VIEW);
}

function canManageUsers(user) {
  return hasAnyUserPermission(user, [
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.USERS_DEACTIVATE,
    PERMISSIONS.USERS_CHANGE_ROLE,
  ]);
}

function hasAnyUserPermission(user, permissions) {
  return permissions.some((permission) => hasPermission(user, permission));
}

module.exports = {
  canAddInternalTicketContent,
  canAssignAsset,
  canAssignTicket,
  canCloseTicket,
  canCommentOnTicket,
  canCreateAsset,
  canCreateTicket,
  canDeleteAsset,
  canEditAsset,
  canManageTicketAttachments,
  canManageUsers,
  canReopenTicket,
  canUpdateTicketStatus,
  canViewAsset,
  canViewAuditLogs,
  canViewInternalTicketArtifacts,
  canViewNotification,
  canViewReports,
  canViewTicket,
  canViewTicketAttachment,
  sameDepartment,
  sameId,
};
