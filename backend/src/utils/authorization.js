function isAdmin(user) {
  return user?.role === 'admin';
}

function isIctOfficer(user) {
  return user?.role === 'ict_officer';
}

function isTechnician(user) {
  return user?.role === 'technician';
}

function isStaff(user) {
  return user?.role === 'staff';
}

function canViewAllOperationalData(user) {
  return isAdmin(user) || isIctOfficer(user);
}

function canManageUsers(user) {
  return isAdmin(user);
}

function canManageDepartments(user) {
  return isAdmin(user);
}

function canViewReports(user) {
  return canViewAllOperationalData(user);
}

function canViewAuditLogs(user) {
  return canViewAllOperationalData(user);
}

function canCreateInvitation(user) {
  return isAdmin(user);
}

function canViewTechnicianDirectory(user) {
  return canViewAllOperationalData(user);
}

function canViewDepartment(user, departmentId) {
  if (canViewAllOperationalData(user)) return true;
  return Boolean(user?.department_id) && Number(user.department_id) === Number(departmentId);
}

function canCreateServiceRequest(user, departmentId) {
  if (!departmentId) return true;
  if (canViewAllOperationalData(user)) return true;
  return Number(user?.department_id) === Number(departmentId);
}

function constrainServiceRequestVisibility(user, { clauses, params, alias = 'sr', mine = false }) {
  if (canViewAllOperationalData(user)) {
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

  params.push(user.user_id);
  clauses.push(`${alias}.requester_id = $${params.length}`);
}

function canViewServiceRequest(user, request) {
  if (!request) return false;
  if (canViewAllOperationalData(user)) return true;
  if (Number(request.requester_id) === Number(user.user_id)) return true;
  if (isTechnician(user) && Number(request.assigned_technician_id) === Number(user.user_id)) return true;
  return false;
}

function canAssignServiceRequest(user) {
  return canViewAllOperationalData(user);
}

function canManageServiceRequestAssignments(user) {
  return canAssignServiceRequest(user);
}

function canUpdateServiceRequest(user, request) {
  if (canViewAllOperationalData(user)) return true;
  return isTechnician(user) && Number(request?.assigned_technician_id) === Number(user.user_id);
}

function canCommentOnServiceRequest(user, request) {
  return canViewServiceRequest(user, request) || canViewAllOperationalData(user);
}

function canAddInternalTicketNote(user) {
  return canViewAllOperationalData(user) || isTechnician(user);
}

function canViewInternalTicketArtifacts(user, request) {
  if (!request) return false;
  if (canViewAllOperationalData(user)) return true;
  return isTechnician(user) && Number(request.assigned_technician_id) === Number(user.user_id);
}

function canManageTicketAttachments(user, request) {
  return canCommentOnServiceRequest(user, request);
}

function constrainAssetVisibility(user, { clauses, params, alias = 'a' }) {
  if (canViewAllOperationalData(user)) return;

  if (isTechnician(user)) {
    params.push(user.user_id);
    const selfParam = params.length;
    params.push(user.department_id || -1);
    const deptParam = params.length;
    clauses.push(`(${alias}.assigned_to = $${selfParam} OR ${alias}.department_id = $${deptParam})`);
    return;
  }

  params.push(user.user_id);
  const selfParam = params.length;
  params.push(user.department_id || -1);
  const deptParam = params.length;
  clauses.push(`(${alias}.assigned_to = $${selfParam} OR ${alias}.department_id = $${deptParam})`);
}

function canViewAsset(user, asset) {
  if (!asset) return false;
  if (canViewAllOperationalData(user)) return true;
  if (Number(asset.assigned_to) === Number(user.user_id)) return true;
  return Boolean(user?.department_id) && Number(asset.department_id) === Number(user.department_id);
}

function canManageAssets(user) {
  return canViewAllOperationalData(user);
}

function canUpdateAssetStatus(user, asset) {
  if (canViewAllOperationalData(user)) return true;
  return isTechnician(user) && canViewAsset(user, asset);
}

function constrainMaintenanceVisibility(user, { clauses, params, maintenanceAlias = 'm', assetAlias = 'a' }) {
  if (canViewAllOperationalData(user)) return;

  if (isTechnician(user)) {
    params.push(user.user_id);
    const selfParam = params.length;
    params.push(user.department_id || -1);
    const deptParam = params.length;
    clauses.push(`(${maintenanceAlias}.technician_id = $${selfParam} OR ${assetAlias}.department_id = $${deptParam})`);
    return;
  }

  clauses.push('1 = 0');
}

function canViewMaintenance(user, record) {
  if (!record) return false;
  if (canViewAllOperationalData(user)) return true;
  if (isTechnician(user) && Number(record.technician_id) === Number(user.user_id)) return true;
  return Boolean(user?.department_id) && Number(record.department_id) === Number(user.department_id);
}

function canCreateMaintenance(user, asset) {
  if (canViewAllOperationalData(user)) return true;
  return isTechnician(user) && canViewAsset(user, asset);
}

function canUpdateMaintenance(user, record) {
  if (canViewAllOperationalData(user)) return true;
  return isTechnician(user) && Number(record?.technician_id) === Number(user.user_id);
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
  canManageServiceRequestAssignments,
  canManageTicketAttachments,
  canManageUsers,
  canUpdateAssetStatus,
  canUpdateMaintenance,
  canUpdateServiceRequest,
  canViewAllOperationalData,
  canViewAsset,
  canViewAuditLogs,
  canViewDepartment,
  canViewMaintenance,
  canViewReports,
  canViewServiceRequest,
  canViewTechnicianDirectory,
  canViewInternalTicketArtifacts,
  constrainAssetVisibility,
  constrainMaintenanceVisibility,
  constrainServiceRequestVisibility,
  isAdmin,
  isIctOfficer,
  isStaff,
  isTechnician,
};
