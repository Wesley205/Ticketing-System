const {
  applyAssetFilters,
  applyMaintenanceFilters,
  applyTicketFilters,
  buildWhereClause,
} = require('../reports/report.service');

function buildTicketScope(filters, scopeBuilder) {
  const clauses = [];
  const params = [];
  applyTicketFilters(filters, { clauses, params, alias: 'sr' });
  scopeBuilder({ clauses, params, alias: 'sr' });
  return { where: buildWhereClause(clauses), params };
}

function buildAssetScope(filters, scopeBuilder) {
  const clauses = [];
  const params = [];
  applyAssetFilters(filters, { clauses, params, alias: 'a' });
  scopeBuilder({ clauses, params, alias: 'a' });
  return { where: buildWhereClause(clauses), params };
}

function buildMaintenanceScope(filters, scopeBuilder) {
  const clauses = [];
  const params = [];
  applyMaintenanceFilters(filters, {
    clauses,
    params,
    maintenanceAlias: 'm',
    assetAlias: 'a',
  });
  scopeBuilder({ clauses, params, maintenanceAlias: 'm', assetAlias: 'a' });
  return { where: buildWhereClause(clauses), params };
}

async function getTicketTotals(executor, scope) {
  const result = await executor.query(
    `SELECT
        COUNT(*) AS total_requests,
        COUNT(*) FILTER (WHERE status IN ('New','Pending')) AS pending_requests,
        COUNT(*) FILTER (WHERE status IN ('Assigned','Accepted','In Progress','Waiting for User','Waiting for Parts','Reopened')) AS in_progress_requests,
        COUNT(*) FILTER (WHERE status IN ('Resolved','Closed')) AS resolved_requests,
        COUNT(*) FILTER (WHERE status NOT IN ('Resolved','Closed','Cancelled')
          AND (
            (sla_response_due_at IS NOT NULL AND first_response_at IS NULL AND sla_response_due_at < NOW())
            OR (sla_resolution_due_at IS NOT NULL AND sla_resolution_due_at < NOW())
            OR (expected_completion_at IS NOT NULL AND expected_completion_at < NOW())
          )
        ) AS overdue_requests,
        COUNT(*) FILTER (WHERE escalation_count > 0) AS escalated_requests,
        COUNT(*) FILTER (WHERE first_response_at IS NOT NULL AND sla_response_due_at IS NOT NULL AND first_response_at <= sla_response_due_at) AS response_sla_met,
        COUNT(*) FILTER (WHERE first_response_at IS NOT NULL AND sla_response_due_at IS NOT NULL) AS response_sla_measured,
        COUNT(*) FILTER (WHERE date_resolved IS NOT NULL AND sla_resolution_due_at IS NOT NULL AND date_resolved <= sla_resolution_due_at) AS resolution_sla_met,
        COUNT(*) FILTER (WHERE date_resolved IS NOT NULL AND sla_resolution_due_at IS NOT NULL) AS resolution_sla_measured,
        AVG(EXTRACT(EPOCH FROM (COALESCE(date_resolved, NOW()) - date_submitted)) / 3600.0)
          FILTER (WHERE date_resolved IS NOT NULL) AS avg_resolution_hours
     FROM service_requests sr
     ${scope.where}`,
    scope.params
  );
  return result.rows[0];
}

async function getTicketStatusRows(executor, scope) {
  const result = await executor.query(
    `SELECT status, COUNT(*) AS total
     FROM service_requests sr
     ${scope.where}
     GROUP BY status
     ORDER BY total DESC, status`,
    scope.params
  );
  return result.rows;
}

async function getTicketPriorityRows(executor, scope) {
  const result = await executor.query(
    `SELECT priority, COUNT(*) AS total
     FROM service_requests sr
     ${scope.where}
     GROUP BY priority
     ORDER BY total DESC, priority`,
    scope.params
  );
  return result.rows;
}

async function getAssetTotals(executor, scope) {
  const result = await executor.query(
    `SELECT
        COUNT(*) AS total_assets,
        COUNT(*) FILTER (WHERE status = 'Active') AS active_assets,
        COUNT(*) FILTER (WHERE status = 'Available') AS available_assets,
        COUNT(*) FILTER (WHERE status = 'Assigned') AS assigned_assets,
        COUNT(*) FILTER (WHERE status = 'Under Maintenance') AS maintenance_assets,
        COUNT(*) FILTER (WHERE status = 'Damaged') AS damaged_assets,
        COUNT(*) FILTER (WHERE status = 'Retired') AS retired_assets
     FROM assets a
     ${scope.where}`,
    scope.params
  );
  return result.rows[0];
}

async function getAssetStatusRows(executor, scope) {
  const result = await executor.query(
    `SELECT status, COUNT(*) AS total
     FROM assets a
     ${scope.where}
     GROUP BY status
     ORDER BY total DESC, status`,
    scope.params
  );
  return result.rows;
}

async function getMaintenanceTotals(executor, scope) {
  const result = await executor.query(
    `SELECT
        COUNT(*) AS total_records,
        COUNT(*) FILTER (WHERE m.status = 'Completed') AS completed_records,
        COUNT(*) FILTER (WHERE m.status IN ('Scheduled','In Progress')) AS open_records,
        COALESCE(SUM(m.cost), 0) AS total_cost,
        COUNT(*) FILTER (WHERE ms.is_active = TRUE AND ms.next_due_at <= NOW()) AS due_schedules
     FROM maintenance m
     JOIN assets a ON a.asset_id = m.asset_id
     LEFT JOIN maintenance_schedules ms ON ms.schedule_id = m.schedule_id
     ${scope.where}`,
    scope.params
  );
  return result.rows[0];
}

async function getTechnicianWorkload(executor, filters, canViewGlobal) {
  if (!canViewGlobal) {
    return [];
  }

  const params = [];
  const clauses = [
    "u.role = 'technician'",
    'u.is_active = TRUE',
  ];

  if (filters.department_id) {
    params.push(filters.department_id);
    clauses.push(`u.department_id = $${params.length}`);
  }

  const result = await executor.query(
    `SELECT u.user_id, u.full_name AS technician,
            COUNT(sr.request_id) FILTER (WHERE sr.status IN ('Assigned','Accepted','In Progress','Waiting for User','Waiting for Parts','Reopened')) AS open_requests,
            COUNT(sr.request_id) FILTER (WHERE sr.status IN ('Resolved','Closed')) AS resolved_requests
     FROM users u
     LEFT JOIN service_requests sr ON sr.assigned_technician_id = u.user_id
     WHERE ${clauses.join(' AND ')}
     GROUP BY u.user_id, u.full_name
     ORDER BY open_requests DESC, resolved_requests DESC, u.full_name`,
    params
  );
  return result.rows;
}

async function getDashboardStats(executor, scopes, filters, canViewGlobal) {
  const [
    ticketTotals,
    ticketStatusRows,
    ticketPriorityRows,
    assetTotals,
    assetStatusRows,
    maintenanceTotals,
    technicianRows,
  ] = await Promise.all([
    getTicketTotals(executor, scopes.ticket),
    getTicketStatusRows(executor, scopes.ticket),
    getTicketPriorityRows(executor, scopes.ticket),
    getAssetTotals(executor, scopes.asset),
    getAssetStatusRows(executor, scopes.asset),
    getMaintenanceTotals(executor, scopes.maintenance),
    getTechnicianWorkload(executor, filters, canViewGlobal),
  ]);

  return {
    assetStatusRows,
    assetTotals,
    maintenanceTotals,
    technicianRows,
    ticketPriorityRows,
    ticketStatusRows,
    ticketTotals,
  };
}

module.exports = {
  buildAssetScope,
  buildMaintenanceScope,
  buildTicketScope,
  getDashboardStats,
  getTechnicianWorkload,
};
