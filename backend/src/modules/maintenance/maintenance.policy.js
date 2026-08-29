const {
  canCreateMaintenance,
  canUpdateMaintenance,
  constrainMaintenanceVisibility,
} = require('../../utils/authorization');

function buildMaintenanceVisibility(user) {
  const visibility = { clauses: [], params: [] };
  constrainMaintenanceVisibility(user, {
    clauses: visibility.clauses,
    params: visibility.params,
    maintenanceAlias: 'm',
    assetAlias: 'a',
  });
  return visibility;
}

module.exports = {
  buildMaintenanceVisibility,
  canCreateMaintenance,
  canUpdateMaintenance,
};
