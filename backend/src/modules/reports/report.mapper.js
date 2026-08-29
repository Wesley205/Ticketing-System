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

function mapReportRows(filters, rows, total) {
  return {
    page: filters.page,
    page_size: filters.page_size,
    total: Number(total || 0),
    rows,
  };
}

function escapeCsvValue(value) {
  return `"${(value ?? '').toString().replace(/"/g, '""')}"`;
}

function toCsv(headers, rows) {
  return [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\n');
}

function mapSummary(filters, rows, scheduledReportArchitecture) {
  return {
    filters_applied: formatAppliedFilters(filters),
    assets_by_type: rows.assetsByType,
    assets_by_status: rows.assetsByStatus,
    assets_by_department: rows.assetsByDepartment,
    requests_by_category: rows.requestsByCategory,
    requests_by_priority: rows.requestsByPriority,
    requests_by_status: rows.requestsByStatus,
    monthly_maintenance: rows.monthlyMaintenance,
    technician_workload: rows.technicianWorkload,
    technician_resolutions: rows.technicianResolutions,
    department_stats: rows.departmentStats,
    requests_by_assignment: rows.requestsByAssignment,
    overdue_tickets: rows.overdueTickets,
    sla_policy_coverage: rows.slaPolicyCoverage,
    maintenance_schedule_health: rows.maintenanceScheduleHealth,
    asset_ticket_linkage: rows.assetTicketLinkage,
    knowledge_base_analytics: rows.knowledgeBaseAnalytics,
    sla_performance: rows.slaPerformance,
    scheduled_report_architecture: scheduledReportArchitecture,
  };
}

module.exports = {
  formatAppliedFilters,
  mapReportRows,
  mapSummary,
  toCsv,
};
