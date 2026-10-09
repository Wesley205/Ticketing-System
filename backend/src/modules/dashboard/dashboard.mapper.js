function formatAppliedFilters(filters) {
  return {
    date_from: filters.date_from ? filters.date_from.toISOString().slice(0, 10) : null,
    date_to: filters.date_to ? filters.date_to.toISOString().slice(0, 10) : null,
    department_id: filters.department_id || null,
    technician_id: filters.technician_id || null,
    category: filters.category || null,
    ticket_type: filters.ticket_type || null,
  };
}

function safeNumber(value) {
  return Number(value || 0);
}

function safeNullableNumber(value) {
  return value === null ? null : Number(value);
}

function mapDashboardStats({ filters, ticketMetrics, assetMetrics, maintenanceMetrics, accessMetrics = {}, ticketStatusRows, ticketPriorityRows, assetStatusRows, technicianRows }) {
  return {
    filters_applied: formatAppliedFilters(filters),
    total_assets: safeNumber(assetMetrics.total_assets),
    active_assets: safeNumber(assetMetrics.active_assets),
    available_assets: safeNumber(assetMetrics.available_assets),
    assigned_assets: safeNumber(assetMetrics.assigned_assets),
    maintenance_assets: safeNumber(assetMetrics.maintenance_assets),
    damaged_assets: safeNumber(assetMetrics.damaged_assets),
    retired_assets: safeNumber(assetMetrics.retired_assets),
    due_maintenance_schedules: safeNumber(maintenanceMetrics.due_schedules),
    pending_invitations: safeNumber(accessMetrics.pending_invitations),
    active_accounts: safeNumber(accessMetrics.active_accounts),
    access_anomalies: safeNumber(accessMetrics.access_anomalies),
    active_departments: safeNumber(accessMetrics.active_departments),
    total_requests: safeNumber(ticketMetrics.total_requests),
    pending_requests: safeNumber(ticketMetrics.pending_requests),
    in_progress_requests: safeNumber(ticketMetrics.in_progress_requests),
    resolved_requests: safeNumber(ticketMetrics.resolved_requests),
    overdue_requests: safeNumber(ticketMetrics.overdue_requests),
    escalated_requests: safeNumber(ticketMetrics.escalated_requests),
    response_sla_met: safeNumber(ticketMetrics.response_sla_met),
    response_sla_measured: safeNumber(ticketMetrics.response_sla_measured),
    resolution_sla_met: safeNumber(ticketMetrics.resolution_sla_met),
    resolution_sla_measured: safeNumber(ticketMetrics.resolution_sla_measured),
    avg_resolution_hours: safeNullableNumber(ticketMetrics.avg_resolution_hours),
    response_sla_met_rate: safeNumber(ticketMetrics.response_sla_measured)
      ? safeNumber(ticketMetrics.response_sla_met) / safeNumber(ticketMetrics.response_sla_measured)
      : null,
    resolution_sla_met_rate: safeNumber(ticketMetrics.resolution_sla_measured)
      ? safeNumber(ticketMetrics.resolution_sla_met) / safeNumber(ticketMetrics.resolution_sla_measured)
      : null,
    maintenance_total_cost: safeNumber(maintenanceMetrics.total_cost),
    maintenance_total_records: safeNumber(maintenanceMetrics.total_records),
    maintenance_completed_records: safeNumber(maintenanceMetrics.completed_records),
    tickets_by_status: ticketStatusRows,
    tickets_by_priority: ticketPriorityRows,
    assets_by_status: assetStatusRows,
    technician_workload: technicianRows,
  };
}

module.exports = {
  formatAppliedFilters,
  mapDashboardStats,
};
