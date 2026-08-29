async function getReportFilters(executor) {
  const [departments, technicians] = await Promise.all([
    executor.query('SELECT department_id, name FROM departments WHERE is_archived = FALSE ORDER BY name'),
    executor.query(`SELECT user_id, full_name, department_id
                    FROM users
                    WHERE role = 'technician' AND is_active = TRUE
                    ORDER BY full_name`),
  ]);

  return {
    departments: departments.rows,
    technicians: technicians.rows,
  };
}

async function getReportSummary(executor, filters, scopes) {
  const [
    assetsByType,
    assetsByStatus,
    assetsByDepartment,
    requestsByCategory,
    requestsByPriority,
    requestsByStatus,
    monthlyMaintenance,
    technicianWorkload,
    technicianResolutions,
    departmentStats,
    requestsByAssignment,
    overdueTickets,
    slaPolicyCoverage,
    maintenanceScheduleHealth,
    assetTicketLinkage,
    knowledgeBaseAnalytics,
    slaPerformance,
  ] = await Promise.all([
    executor.query(`SELECT a.asset_type, COUNT(*) AS total FROM assets a ${scopes.asset.where} GROUP BY a.asset_type ORDER BY total DESC`, scopes.asset.params),
    executor.query(`SELECT a.status, COUNT(*) AS total FROM assets a ${scopes.asset.where} GROUP BY a.status ORDER BY total DESC`, scopes.asset.params),
    executor.query(`SELECT d.name AS department, COUNT(a.asset_id) AS total
                    FROM departments d
                    LEFT JOIN assets a ON a.department_id = d.department_id
                    ${filters.department_id ? 'WHERE d.department_id = $1' : ''}
                    GROUP BY d.name ORDER BY total DESC`,
      filters.department_id ? [filters.department_id] : []),
    executor.query(`SELECT sr.category, COUNT(*) AS total FROM service_requests sr ${scopes.ticket.where} GROUP BY sr.category ORDER BY total DESC`, scopes.ticket.params),
    executor.query(`SELECT sr.priority, COUNT(*) AS total FROM service_requests sr ${scopes.ticket.where} GROUP BY sr.priority ORDER BY total DESC`, scopes.ticket.params),
    executor.query(`SELECT sr.status, COUNT(*) AS total FROM service_requests sr ${scopes.ticket.where} GROUP BY sr.status ORDER BY total DESC`, scopes.ticket.params),
    executor.query(`SELECT TO_CHAR(DATE_TRUNC('month', m.maintenance_date), 'YYYY-MM') AS month,
                           COUNT(*) AS total_records, COALESCE(SUM(m.cost),0) AS total_cost
                    FROM maintenance m
                    JOIN assets a ON a.asset_id = m.asset_id
                    ${scopes.maintenance.where}
                    GROUP BY month ORDER BY month DESC LIMIT 12`, scopes.maintenance.params),
    executor.query(`SELECT u.full_name AS technician,
                           COUNT(sr.request_id) FILTER (WHERE sr.status IN ('Assigned','Accepted','In Progress','Waiting for User','Waiting for Parts','Reopened')) AS open_requests
                    FROM users u
                    LEFT JOIN service_requests sr ON sr.assigned_technician_id = u.user_id
                    WHERE u.role = 'technician'
                      ${filters.department_id ? 'AND u.department_id = $1' : ''}
                    GROUP BY u.full_name ORDER BY open_requests DESC`, filters.department_id ? [filters.department_id] : []),
    executor.query(`SELECT u.full_name AS technician,
                           COUNT(*) FILTER (WHERE sr.status IN ('Resolved','Closed')) AS resolved_count
                    FROM users u
                    JOIN service_requests sr ON sr.assigned_technician_id = u.user_id
                    WHERE u.role = 'technician'
                      ${filters.department_id ? 'AND u.department_id = $1' : ''}
                    GROUP BY u.full_name ORDER BY resolved_count DESC`, filters.department_id ? [filters.department_id] : []),
    executor.query(`SELECT d.name,
                      (SELECT COUNT(*) FROM assets a WHERE a.department_id = d.department_id) AS total_assets,
                      (SELECT COUNT(*) FROM service_requests sr WHERE sr.department_id = d.department_id) AS total_requests
                    FROM departments d
                    ${filters.department_id ? 'WHERE d.department_id = $1' : ''}
                    ORDER BY d.name`, filters.department_id ? [filters.department_id] : []),
    executor.query(`SELECT
                      COUNT(*) FILTER (WHERE sr.assigned_technician_id IS NULL AND sr.status NOT IN ('Closed','Cancelled')) AS unassigned,
                      COUNT(*) FILTER (WHERE sr.assigned_technician_id IS NOT NULL AND sr.status IN ('Assigned','Accepted','In Progress','Waiting for User','Waiting for Parts','Reopened')) AS actively_assigned,
                      COUNT(*) FILTER (WHERE sr.expected_completion_at IS NOT NULL AND sr.expected_completion_at < NOW() AND sr.status NOT IN ('Resolved','Closed','Cancelled')) AS expected_completion_overdue
                    FROM service_requests sr
                    ${scopes.ticket.where}`, scopes.ticket.params),
    executor.query(`SELECT sr.ticket_number, sr.subject, sr.priority, sr.status, sr.expected_completion_at, sr.escalation_count
                    FROM service_requests sr
                    ${scopes.ticket.where ? `${scopes.ticket.where} AND` : 'WHERE'}
                      sr.status NOT IN ('Resolved','Closed','Cancelled')
                      AND (
                        (sr.sla_response_due_at IS NOT NULL AND sr.first_response_at IS NULL AND sr.sla_response_due_at < NOW())
                        OR (sr.sla_resolution_due_at IS NOT NULL AND sr.sla_resolution_due_at < NOW())
                        OR (sr.expected_completion_at IS NOT NULL AND sr.expected_completion_at < NOW())
                      )
                    ORDER BY sr.priority DESC, sr.expected_completion_at NULLS LAST, sr.ticket_number
                    LIMIT 25`, scopes.ticket.params),
    executor.query(`SELECT
                      COUNT(*) FILTER (WHERE sr.sla_policy_id IS NOT NULL) AS with_policy,
                      COUNT(*) FILTER (WHERE sr.sla_policy_id IS NULL) AS without_policy,
                      COUNT(*) FILTER (WHERE sr.escalation_count > 0) AS escalated
                    FROM service_requests sr
                    ${scopes.ticket.where}`, scopes.ticket.params),
    executor.query(`SELECT
                      COUNT(*) FILTER (WHERE ms.is_active = TRUE) AS active_schedules,
                      COUNT(*) FILTER (WHERE ms.is_active = TRUE AND ms.next_due_at <= NOW()) AS due_now,
                      COUNT(*) FILTER (WHERE ms.is_active = TRUE AND ms.next_due_at < NOW() - INTERVAL '7 days') AS overdue
                    FROM maintenance_schedules ms
                    JOIN assets a ON a.asset_id = ms.asset_id
                    ${filters.department_id ? 'WHERE a.department_id = $1' : ''}`, filters.department_id ? [filters.department_id] : []),
    executor.query(`SELECT
                      COUNT(*) FILTER (WHERE sr.affected_asset_id IS NOT NULL) AS linked_tickets,
                      COUNT(*) FILTER (WHERE sr.affected_asset_id IS NULL) AS unlinked_tickets
                    FROM service_requests sr
                    ${scopes.ticket.where}`, scopes.ticket.params),
    executor.query(`SELECT
                      COUNT(*) FILTER (WHERE status = 'published') AS published,
                      COUNT(*) FILTER (WHERE status = 'draft') AS draft,
                      COUNT(*) FILTER (WHERE status = 'in_review') AS in_review,
                      COUNT(*) FILTER (WHERE status = 'archived') AS archived,
                      COALESCE(SUM(helpful_count), 0) AS helpful_feedback,
                      COALESCE(SUM(not_helpful_count), 0) AS not_helpful_feedback,
                      COALESCE(SUM(view_count), 0) AS total_views
                    FROM knowledge_base_articles`),
    executor.query(`SELECT
                      COUNT(*) FILTER (WHERE sr.first_response_at IS NOT NULL AND sr.sla_response_due_at IS NOT NULL AND sr.first_response_at <= sr.sla_response_due_at) AS response_met,
                      COUNT(*) FILTER (WHERE sr.first_response_at IS NOT NULL AND sr.sla_response_due_at IS NOT NULL) AS response_measured,
                      COUNT(*) FILTER (WHERE sr.date_resolved IS NOT NULL AND sr.sla_resolution_due_at IS NOT NULL AND sr.date_resolved <= sr.sla_resolution_due_at) AS resolution_met,
                      COUNT(*) FILTER (WHERE sr.date_resolved IS NOT NULL AND sr.sla_resolution_due_at IS NOT NULL) AS resolution_measured,
                      AVG(EXTRACT(EPOCH FROM (sr.first_response_at - sr.date_submitted)) / 3600.0) FILTER (WHERE sr.first_response_at IS NOT NULL) AS avg_response_hours,
                      AVG(EXTRACT(EPOCH FROM (sr.date_resolved - sr.date_submitted)) / 3600.0) FILTER (WHERE sr.date_resolved IS NOT NULL) AS avg_resolution_hours
                    FROM service_requests sr
                    ${scopes.ticket.where}`, scopes.ticket.params),
  ]);

  return {
    assetsByType: assetsByType.rows,
    assetsByStatus: assetsByStatus.rows,
    assetsByDepartment: assetsByDepartment.rows,
    requestsByCategory: requestsByCategory.rows,
    requestsByPriority: requestsByPriority.rows,
    requestsByStatus: requestsByStatus.rows,
    monthlyMaintenance: monthlyMaintenance.rows,
    technicianWorkload: technicianWorkload.rows,
    technicianResolutions: technicianResolutions.rows,
    departmentStats: departmentStats.rows,
    requestsByAssignment: requestsByAssignment.rows[0],
    overdueTickets: overdueTickets.rows,
    slaPolicyCoverage: slaPolicyCoverage.rows[0],
    maintenanceScheduleHealth: maintenanceScheduleHealth.rows[0],
    assetTicketLinkage: assetTicketLinkage.rows[0],
    knowledgeBaseAnalytics: knowledgeBaseAnalytics.rows[0],
    slaPerformance: slaPerformance.rows[0],
  };
}

async function getTicketReportRows(executor, filters, scope, addPagination) {
  const params = [...scope.params];
  const { limitParam, offsetParam } = addPagination(params, filters);
  const [rows, count] = await Promise.all([
    executor.query(
      `SELECT sr.ticket_number, sr.subject, sr.category, sr.ticket_type, sr.priority, sr.status,
              sr.date_submitted, sr.date_resolved, sr.expected_completion_at, sr.escalation_count,
              req.full_name AS requester_name, tech.full_name AS technician_name, d.name AS department_name
       FROM service_requests sr
       LEFT JOIN users req ON req.user_id = sr.requester_id
       LEFT JOIN users tech ON tech.user_id = sr.assigned_technician_id
       LEFT JOIN departments d ON d.department_id = sr.department_id
       ${scope.where}
       ORDER BY sr.date_submitted DESC, sr.request_id DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params
    ),
    executor.query(`SELECT COUNT(*) AS total FROM service_requests sr ${scope.where}`, scope.params),
  ]);

  return { rows: rows.rows, total: count.rows[0].total };
}

async function getAssetReportRows(executor, filters, scope, addPagination) {
  const params = [...scope.params];
  const { limitParam, offsetParam } = addPagination(params, filters);
  const [rows, count] = await Promise.all([
    executor.query(
      `SELECT a.asset_tag, a.asset_type, a.brand, a.model, a.status, a.condition, a.purchase_date,
              d.name AS department_name, u.full_name AS assigned_staff_name
       FROM assets a
       LEFT JOIN departments d ON d.department_id = a.department_id
       LEFT JOIN users u ON u.user_id = a.assigned_to
       ${scope.where}
       ORDER BY a.date_added DESC, a.asset_id DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params
    ),
    executor.query(`SELECT COUNT(*) AS total FROM assets a ${scope.where}`, scope.params),
  ]);

  return { rows: rows.rows, total: count.rows[0].total };
}

async function getMaintenanceReportRows(executor, filters, scope, addPagination) {
  const params = [...scope.params];
  const { limitParam, offsetParam } = addPagination(params, filters);
  const [rows, count] = await Promise.all([
    executor.query(
      `SELECT m.maintenance_id, m.maintenance_type, m.problem, m.status, m.cost, m.maintenance_date,
              m.next_due_at, a.asset_tag, a.asset_type, d.name AS department_name, u.full_name AS technician_name
       FROM maintenance m
       JOIN assets a ON a.asset_id = m.asset_id
       LEFT JOIN departments d ON d.department_id = a.department_id
       LEFT JOIN users u ON u.user_id = m.technician_id
       ${scope.where}
       ORDER BY m.maintenance_date DESC, m.maintenance_id DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params
    ),
    executor.query(`SELECT COUNT(*) AS total FROM maintenance m JOIN assets a ON a.asset_id = m.asset_id ${scope.where}`, scope.params),
  ]);

  return { rows: rows.rows, total: count.rows[0].total };
}

async function getAssetCsvRows(executor, scope) {
  const result = await executor.query(
    `SELECT a.asset_tag, a.asset_type, a.brand, a.model, a.serial_number,
            d.name AS department, u.full_name AS assigned_staff, a.status, a.condition,
            a.location, a.purchase_date
     FROM assets a
     LEFT JOIN departments d ON d.department_id = a.department_id
     LEFT JOIN users u ON u.user_id = a.assigned_to
     ${scope.where}
     ORDER BY a.asset_id`,
    scope.params
  );
  return result.rows;
}

async function getServiceRequestCsvRows(executor, scope) {
  const result = await executor.query(
    `SELECT sr.request_id, sr.ticket_number, req.full_name AS requester, d.name AS department, sr.category,
            sr.ticket_type, sr.subject, sr.priority, sr.status, tech.full_name AS technician,
            sr.assignment_notes, sr.expected_completion_at, sr.sla_response_due_at, sr.sla_resolution_due_at,
            sr.escalation_count, sr.date_submitted, sr.date_resolved
     FROM service_requests sr
     LEFT JOIN users req ON req.user_id = sr.requester_id
     LEFT JOIN departments d ON d.department_id = sr.department_id
     LEFT JOIN users tech ON tech.user_id = sr.assigned_technician_id
     ${scope.where}
     ORDER BY sr.request_id`,
    scope.params
  );
  return result.rows;
}

module.exports = {
  getAssetCsvRows,
  getAssetReportRows,
  getMaintenanceReportRows,
  getReportFilters,
  getReportSummary,
  getServiceRequestCsvRows,
  getTicketReportRows,
};
