const pool = require('../../config/db');
const { parseReportFilters } = require('../reports/report.service');
const mapper = require('./dashboard.mapper');
const policy = require('./dashboard.policy');
const repository = require('./dashboard.repository');

function parseDashboardFilters(user, rawQuery) {
  return policy.parseScopeFilters(user, parseReportFilters(rawQuery));
}

function buildDashboardScopes(user, filters) {
  return {
    ticket: repository.buildTicketScope(filters, (scope) => policy.applyTicketScope(user, scope)),
    asset: repository.buildAssetScope(filters, (scope) => policy.applyAssetScope(user, scope)),
    maintenance: repository.buildMaintenanceScope(filters, (scope) => policy.applyMaintenanceScope(user, scope)),
  };
}

async function getDashboardStats(user, rawQuery = {}, executor = pool) {
  const filters = parseDashboardFilters(user, rawQuery);
  const scopes = buildDashboardScopes(user, filters);
  const stats = await repository.getDashboardStats(
    executor,
    scopes,
    filters,
    policy.canViewAllOperationalData(user)
  );

  return mapper.mapDashboardStats({
    filters,
    ticketMetrics: stats.ticketTotals,
    assetMetrics: stats.assetTotals,
    maintenanceMetrics: stats.maintenanceTotals,
    ticketStatusRows: stats.ticketStatusRows,
    ticketPriorityRows: stats.ticketPriorityRows,
    assetStatusRows: stats.assetStatusRows,
    technicianRows: stats.technicianRows,
    accessMetrics: stats.accessTotals,
  });
}

module.exports = {
  buildDashboardScopes,
  getDashboardStats,
  parseDashboardFilters,
};
