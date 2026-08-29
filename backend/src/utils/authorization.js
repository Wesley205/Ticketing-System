const { PERMISSIONS } = require("../authorization/permissions");
const { ROLES } = require("../authorization/roles");
const {
  getUserPermissions,
  hasPermission,
  hasRole,
} = require("../authorization/policy");
const access = require("../authorization/resourceAccess");

function isAdmin(user) {
  return hasRole(user, ROLES.ADMIN);
}

function isIctOfficer(user) {
  return hasRole(user, ROLES.ICT_OFFICER);
}

function isTechnician(user) {
  return hasRole(user, ROLES.TECHNICIAN);
}

function isStaff(user) {
  return hasRole(user, ROLES.STAFF);
}

function canViewAllOperationalData(user) {
  return hasPermission(user, PERMISSIONS.TICKETS_VIEW_ALL);
}

function canManageUsers(user) {
  return access.canManageUsers(user);
}

function canManageDepartments(user) {
  return isAdmin(user);
}

function canViewReports(user) {
  return access.canViewReports(user);
}

function canViewAuditLogs(user) {
  return access.canViewAuditLogs(user);
}

function canCreateInvitation(user) {
  return hasPermission(user, PERMISSIONS.USERS_CREATE);
}

function canViewTechnicianDirectory(user) {
  return canViewAllOperationalData(user);
}

function canViewDepartment(user, departmentId) {
  if (canViewAllOperationalData(user)) return true;
  return (
    Boolean(user?.department_id) &&
    Number(user.department_id) === Number(departmentId)
  );
}

function canCreateServiceRequest(user, departmentId) {
  return access.canCreateTicket(user, departmentId);
}

function constrainServiceRequestVisibility(
  user,
  { clauses, params, alias = "sr", mine = false },
) {
  if (hasPermission(user, PERMISSIONS.TICKETS_VIEW_ALL)) {
    if (mine) {
      params.push(user.user_id);
      clauses.push(`${alias}.requester_id = $${params.length}`);
    }
    return;
  }

  if (isTechnician(user)) {
    params.push(user.user_id);
    clauses.push(`${alias}.assigned_technician_id = $${params.length}`);
    return;
  }

  if (
    hasPermission(user, PERMISSIONS.TICKETS_VIEW_DEPARTMENT) &&
    user?.department_id
  ) {
    params.push(user.department_id);
    clauses.push(`${alias}.department_id = $${params.length}`);
    return;
  }

  params.push(user.user_id);
  clauses.push(`${alias}.requester_id = $${params.length}`);
}

function canViewServiceRequest(user, request) {
  return access.canViewTicket(user, request);
}

function canAssignServiceRequest(user) {
  return access.canAssignTicket(user);
}

function canManageServiceRequestAssignments(user) {
  return canAssignServiceRequest(user);
}

function canUpdateServiceRequest(user, request) {
  return access.canUpdateTicketStatus(user, request);
}

function canCommentOnServiceRequest(user, request) {
  return access.canCommentOnTicket(user, request);
}

function canAddInternalTicketNote(user) {
  return access.canAddInternalTicketContent(user);
}

function canViewInternalTicketArtifacts(user, request) {
  return access.canViewInternalTicketArtifacts(user, request);
}

function canManageTicketAttachments(user, request) {
  return access.canManageTicketAttachments(user, request);
}

function constrainAssetVisibility(user, { clauses, params, alias = "a" }) {
  if (canViewAllOperationalData(user)) return;

  params.push(user.user_id);
  const selfParam = params.length;
  params.push(user.department_id || -1);
  const deptParam = params.length;
  clauses.push(
    `(${alias}.assigned_to = $${selfParam} OR ${alias}.department_id = $${deptParam})`,
  );
}

function canViewAsset(user, asset) {
  return access.canViewAsset(user, asset);
}

function canManageAssets(user) {
  return access.canCreateAsset(user) || access.canAssignAsset(user);
}

function canUpdateAssetStatus(user, asset) {
  return access.canEditAsset(user, asset);
}

function constrainMaintenanceVisibility(
  user,
  { clauses, params, maintenanceAlias = "m", assetAlias = "a" },
) {
  if (canViewAllOperationalData(user)) return;

  if (isTechnician(user)) {
    params.push(user.user_id);
    const selfParam = params.length;
    params.push(user.department_id || -1);
    const deptParam = params.length;
    clauses.push(
      `(${maintenanceAlias}.technician_id = $${selfParam} OR ${assetAlias}.department_id = $${deptParam})`,
    );
    return;
  }

  if (user?.department_id) {
    params.push(user.department_id);
    clauses.push(`${assetAlias}.department_id = $${params.length}`);
    return;
  }

  clauses.push("1 = 0");
}

function canViewMaintenance(user, record) {
  if (!record) return false;
  if (canViewAllOperationalData(user)) return true;
  if (
    isTechnician(user) &&
    Number(record.technician_id) === Number(user.user_id)
  )
    return true;
  return (
    Boolean(user?.department_id) &&
    Number(record.department_id) === Number(user.department_id)
  );
}

function canCreateMaintenance(user, asset) {
  if (canViewAllOperationalData(user)) return true;
  return isTechnician(user) && canViewAsset(user, asset);
}

function canUpdateMaintenance(user, record) {
  if (canViewAllOperationalData(user)) return true;
  return (
    isTechnician(user) && Number(record?.technician_id) === Number(user.user_id)
  );
}

function canManageKnowledgeBase(user) {
  return isAdmin(user) || isIctOfficer(user);
}

function canViewKnowledgeBaseArticle(user, article) {
  if (!user || !article) return false;
  if (canManageKnowledgeBase(user)) return true;

  if (article.status !== "published") {
    return false;
  }

  if (article.visibility_scope === "all_users") {
    return true;
  }

  if (article.visibility_scope === "operational_only") {
    return isTechnician(user);
  }

  if (article.visibility_scope === "department") {
    return (
      Boolean(user.department_id) &&
      Number(user.department_id) === Number(article.department_id)
    );
  }

  return false;
}

function constrainKnowledgeBaseVisibility(
  user,
  { clauses, params, alias = "kba" },
) {
  if (canManageKnowledgeBase(user)) return;

  params.push("published");
  const publishedParam = params.length;

  params.push("all_users");
  const allUsersParam = params.length;

  params.push("department");
  const deptScopeParam = params.length;

  params.push(user.department_id ? Number(user.department_id) : -1);
  const deptParam = params.length;

  if (isTechnician(user)) {
    params.push("operational_only");
    const opsParam = params.length;

    clauses.push(
      `(${alias}.status = $${publishedParam}::varchar AND (` +
        `${alias}.visibility_scope = $${allUsersParam}::varchar OR ` +
        `${alias}.visibility_scope = $${opsParam}::varchar OR ` +
        `(${alias}.visibility_scope = $${deptScopeParam}::varchar AND ${alias}.department_id = $${deptParam}::integer)` +
        `))`,
    );
    return;
  }

  clauses.push(
    `(${alias}.status = $${publishedParam}::varchar AND (` +
      `${alias}.visibility_scope = $${allUsersParam}::varchar OR ` +
      `(${alias}.visibility_scope = $${deptScopeParam}::varchar AND ${alias}.department_id = $${deptParam}::integer)` +
      `))`,
  );
}

function canProvideKnowledgeBaseFeedback(user) {
  return Boolean(user?.user_id);
}

function buildFrontendPermissions(user) {
  return {
    can_view_all_operational_data: canViewAllOperationalData(user),
    can_manage_users: canManageUsers(user),
    can_manage_departments: canManageDepartments(user),
    can_view_reports: canViewReports(user),
    can_view_audit_logs: canViewAuditLogs(user),
    can_create_invitation: canCreateInvitation(user),
    can_view_technician_directory: canViewTechnicianDirectory(user),
    can_assign_service_request: canAssignServiceRequest(user),
    can_manage_service_request_assignments:
      canManageServiceRequestAssignments(user),
    can_add_internal_ticket_note: canAddInternalTicketNote(user),
    can_manage_assets: canManageAssets(user),
    can_manage_maintenance:
      canViewAllOperationalData(user) || isTechnician(user),
    can_manage_knowledge_base: canManageKnowledgeBase(user),
    can_provide_knowledge_base_feedback: canProvideKnowledgeBaseFeedback(user),
    can_access_staff_portal: Boolean(user?.user_id),
    can_access_department_portal:
      canViewAllOperationalData(user) || Boolean(user?.department_id),
    can_access_technician_portal: isTechnician(user),
    can_access_admin_portal: isAdmin(user),
    can_access_notifications: Boolean(user?.user_id),
    can_access_dashboard: Boolean(user?.user_id),
    can_access_service_desk: Boolean(user?.user_id),
    can_access_assets: Boolean(user?.user_id),
    can_access_knowledge_base: Boolean(user?.user_id),
    permissions: getUserPermissions(user),
  };
}

function buildFrontendAccessProfile(user) {
  const permissions = buildFrontendPermissions(user);
  const assignedOnly = isTechnician(user);
  const departmentScope =
    !canViewAllOperationalData(user) && Boolean(user?.department_id);
  const userScope = !canViewAllOperationalData(user) && !isTechnician(user);
  const roleLabel =
    {
      admin: "Administrator",
      ict_officer: "ICT Officer",
      technician: "Technician",
      staff: "Staff/User",
    }[user?.role] ||
    user?.role ||
    "User";

  const primaryPortal = isAdmin(user)
    ? "administrator"
    : isIctOfficer(user)
      ? "ict_officer"
      : isTechnician(user)
        ? "technician"
        : departmentScope
          ? "department_supervisor"
          : "staff";

  return {
    role: user?.role || null,
    role_label: roleLabel,
    user_type: user?.user_type || null,
    department_id: user?.department_id || null,
    permissions,
    scope: {
      organization_scope: canViewAllOperationalData(user),
      department_scope: departmentScope,
      assigned_only: assignedOnly,
      user_only: userScope,
    },
    primary_portal: primaryPortal,
  };
}

module.exports = {
  canAssignServiceRequest,
  canAddInternalTicketNote,
  canCommentOnServiceRequest,
  canCreateInvitation,
  canCreateMaintenance,
  canCreateServiceRequest,
  canManageAssets,
  canManageDepartments,
  canManageKnowledgeBase,
  canManageServiceRequestAssignments,
  canManageTicketAttachments,
  canManageUsers,
  canProvideKnowledgeBaseFeedback,
  canUpdateAssetStatus,
  canUpdateMaintenance,
  canUpdateServiceRequest,
  canViewAllOperationalData,
  canViewAsset,
  canViewAuditLogs,
  canViewDepartment,
  canViewKnowledgeBaseArticle,
  canViewMaintenance,
  canViewReports,
  canViewServiceRequest,
  canViewTechnicianDirectory,
  canViewInternalTicketArtifacts,
  buildFrontendAccessProfile,
  buildFrontendPermissions,
  constrainAssetVisibility,
  constrainKnowledgeBaseVisibility,
  constrainMaintenanceVisibility,
  constrainServiceRequestVisibility,
  isAdmin,
  isIctOfficer,
  isStaff,
  isTechnician,
};
