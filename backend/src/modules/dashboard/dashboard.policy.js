const { canViewAllOperationalData, isTechnician } = require('../../utils/authorization');

function parseScopeFilters(user, filters) {
  const scoped = { ...filters };
  if (!canViewAllOperationalData(user)) {
    scoped.department_id = user.department_id || null;
    if (isTechnician(user)) {
      scoped.technician_id = user.user_id;
    }
  }
  return scoped;
}

function applyTicketScope(user, { clauses, params, alias = 'sr' }) {
  if (canViewAllOperationalData(user)) return;

  if (isTechnician(user)) {
    params.push(user.user_id);
    clauses.push(`${alias}.assigned_technician_id = $${params.length}`);
    return;
  }

  params.push(user.user_id);
  clauses.push(`${alias}.requester_id = $${params.length}`);
}

function applyAssetScope(user, { clauses, params, alias = 'a' }) {
  if (canViewAllOperationalData(user)) return;

  params.push(user.user_id);
  const selfParam = params.length;
  params.push(user.department_id || -1);
  const deptParam = params.length;
  clauses.push(`(${alias}.assigned_to = $${selfParam} OR ${alias}.department_id = $${deptParam})`);
}

function applyMaintenanceScope(user, { clauses, params, maintenanceAlias = 'm', assetAlias = 'a' }) {
  if (canViewAllOperationalData(user)) return;

  if (isTechnician(user)) {
    params.push(user.user_id);
    const techParam = params.length;
    params.push(user.department_id || -1);
    const deptParam = params.length;
    clauses.push(`(${maintenanceAlias}.technician_id = $${techParam} OR ${assetAlias}.department_id = $${deptParam})`);
    return;
  }

  clauses.push('1 = 0');
}

module.exports = {
  applyAssetScope,
  applyMaintenanceScope,
  applyTicketScope,
  canViewAllOperationalData,
  isTechnician,
  parseScopeFilters,
};
