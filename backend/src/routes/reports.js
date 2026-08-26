const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { canViewReports } = require('../utils/authorization');
const {
  addPagination,
  applyAssetFilters,
  applyMaintenanceFilters,
  applyTicketFilters,
  buildScheduledReportArchitecture,
  buildWhereClause,
  parseReportFilters,
} = require('../services/reporting');

const router = express.Router();

function requireReportAccess(req, res) {
  if (!canViewReports(req.user)) {
    res.status(403).json({ error: 'You do not have permission to view reports.' });
    return false;
  }
  return true;
}

router.get('/filters', requireAuth, async (req, res) => {
  if (!requireReportAccess(req, res)) return;

  try {
    const [departments, technicians] = await Promise.all([
      pool.query('SELECT department_id, name FROM departments WHERE is_archived = FALSE ORDER BY name'),
      pool.query(`SELECT user_id, full_name, department_id
                  FROM users
                  WHERE role = 'technician' AND is_active = TRUE
                  ORDER BY full_name`),
    ]);

    res.json({
      departments: departments.rows,
      technicians: technicians.rows,
      ticket_categories: ['Computer', 'Network', 'Printer', 'Internet', 'Software', 'Email', 'Hardware', 'Other'],
      ticket_types: ['Incident', 'Service Request', 'Access Request', 'Maintenance Request', 'Change Request'],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load report filters.' });
  }
});

router.get('/summary', requireAuth, async (req, res) => {
  if (!requireReportAccess(req, res)) return;

  try {
    const filters = parseReportFilters(req.query);

    const ticketClauses = [];
    const ticketParams = [];
    applyTicketFilters(filters, { clauses: ticketClauses, params: ticketParams, alias: 'sr' });
    const ticketWhere = buildWhereClause(ticketClauses);

    const assetClauses = [];
    const assetParams = [];
    applyAssetFilters(filters, { clauses: assetClauses, params: assetParams, alias: 'a' });
    const assetWhere = buildWhereClause(assetClauses);

    const maintenanceClauses = [];
    const maintenanceParams = [];
    applyMaintenanceFilters(filters, { clauses: maintenanceClauses, params: maintenanceParams, maintenanceAlias: 'm', assetAlias: 'a' });
    const maintenanceWhere = buildWhereClause(maintenanceClauses);

    const [
      assetsByType, assetsByStatus, assetsByDepartment,
      requestsByCategory, requestsByPriority, requestsByStatus,
      monthlyMaintenance, technicianWorkload, technicianResolutions, departmentStats,
      requestsByAssignment, overdueTickets, slaPolicyCoverage, maintenanceScheduleHealth,
      assetTicketLinkage, knowledgeBaseAnalytics, slaPerformance,
    ] = await Promise.all([
      pool.query(`SELECT a.asset_type, COUNT(*) AS total FROM assets a ${assetWhere} GROUP BY a.asset_type ORDER BY total DESC`, assetParams),
      pool.query(`SELECT a.status, COUNT(*) AS total FROM assets a ${assetWhere} GROUP BY a.status ORDER BY total DESC`, assetParams),
      pool.query(`SELECT d.name AS department, COUNT(a.asset_id) AS total
                  FROM departments d
                  LEFT JOIN assets a ON a.department_id = d.department_id
                  ${filters.department_id ? 'WHERE d.department_id = $1' : ''}
                  GROUP BY d.name ORDER BY total DESC`,
        filters.department_id ? [filters.department_id] : []),
      pool.query(`SELECT sr.category, COUNT(*) AS total FROM service_requests sr ${ticketWhere} GROUP BY sr.category ORDER BY total DESC`, ticketParams),
      pool.query(`SELECT sr.priority, COUNT(*) AS total FROM service_requests sr ${ticketWhere} GROUP BY sr.priority ORDER BY total DESC`, ticketParams),
      pool.query(`SELECT sr.status, COUNT(*) AS total FROM service_requests sr ${ticketWhere} GROUP BY sr.status ORDER BY total DESC`, ticketParams),
      pool.query(`SELECT TO_CHAR(DATE_TRUNC('month', m.maintenance_date), 'YYYY-MM') AS month,
                         COUNT(*) AS total_records, COALESCE(SUM(m.cost),0) AS total_cost
                  FROM maintenance m
                  JOIN assets a ON a.asset_id = m.asset_id
                  ${maintenanceWhere}
                  GROUP BY month ORDER BY month DESC LIMIT 12`, maintenanceParams),
      pool.query(`SELECT u.full_name AS technician,
                         COUNT(sr.request_id) FILTER (WHERE sr.status IN ('Assigned','Accepted','In Progress','Waiting for User','Waiting for Parts','Reopened')) AS open_requests
                  FROM users u
                  LEFT JOIN service_requests sr ON sr.assigned_technician_id = u.user_id
                  WHERE u.role = 'technician'
                    ${filters.department_id ? 'AND u.department_id = $1' : ''}
                  GROUP BY u.full_name ORDER BY open_requests DESC`, filters.department_id ? [filters.department_id] : []),
      pool.query(`SELECT u.full_name AS technician,
                         COUNT(*) FILTER (WHERE sr.status IN ('Resolved','Closed')) AS resolved_count
                  FROM users u
                  JOIN service_requests sr ON sr.assigned_technician_id = u.user_id
                  WHERE u.role = 'technician'
                    ${filters.department_id ? 'AND u.department_id = $1' : ''}
                  GROUP BY u.full_name ORDER BY resolved_count DESC`, filters.department_id ? [filters.department_id] : []),
      pool.query(`SELECT d.name,
                    (SELECT COUNT(*) FROM assets a WHERE a.department_id = d.department_id) AS total_assets,
                    (SELECT COUNT(*) FROM service_requests sr WHERE sr.department_id = d.department_id) AS total_requests
                  FROM departments d
                  ${filters.department_id ? 'WHERE d.department_id = $1' : ''}
                  ORDER BY d.name`, filters.department_id ? [filters.department_id] : []),
      pool.query(`SELECT
                    COUNT(*) FILTER (WHERE sr.assigned_technician_id IS NULL AND sr.status NOT IN ('Closed','Cancelled')) AS unassigned,
                    COUNT(*) FILTER (WHERE sr.assigned_technician_id IS NOT NULL AND sr.status IN ('Assigned','Accepted','In Progress','Waiting for User','Waiting for Parts','Reopened')) AS actively_assigned,
                    COUNT(*) FILTER (WHERE sr.expected_completion_at IS NOT NULL AND sr.expected_completion_at < NOW() AND sr.status NOT IN ('Resolved','Closed','Cancelled')) AS expected_completion_overdue
                  FROM service_requests sr
                  ${ticketWhere}`, ticketParams),
      pool.query(`SELECT sr.ticket_number, sr.subject, sr.priority, sr.status, sr.expected_completion_at, sr.escalation_count
                  FROM service_requests sr
                  ${ticketWhere ? `${ticketWhere} AND` : 'WHERE'}
                    sr.status NOT IN ('Resolved','Closed','Cancelled')
                    AND (
                      (sr.sla_response_due_at IS NOT NULL AND sr.first_response_at IS NULL AND sr.sla_response_due_at < NOW())
                      OR (sr.sla_resolution_due_at IS NOT NULL AND sr.sla_resolution_due_at < NOW())
                      OR (sr.expected_completion_at IS NOT NULL AND sr.expected_completion_at < NOW())
                    )
                  ORDER BY sr.priority DESC, sr.expected_completion_at NULLS LAST, sr.ticket_number
                  LIMIT 25`, ticketParams),
      pool.query(`SELECT
                    COUNT(*) FILTER (WHERE sr.sla_policy_id IS NOT NULL) AS with_policy,
                    COUNT(*) FILTER (WHERE sr.sla_policy_id IS NULL) AS without_policy,
                    COUNT(*) FILTER (WHERE sr.escalation_count > 0) AS escalated
                  FROM service_requests sr
                  ${ticketWhere}`, ticketParams),
      pool.query(`SELECT
                    COUNT(*) FILTER (WHERE ms.is_active = TRUE) AS active_schedules,
                    COUNT(*) FILTER (WHERE ms.is_active = TRUE AND ms.next_due_at <= NOW()) AS due_now,
                    COUNT(*) FILTER (WHERE ms.is_active = TRUE AND ms.next_due_at < NOW() - INTERVAL '7 days') AS overdue
                  FROM maintenance_schedules ms
                  JOIN assets a ON a.asset_id = ms.asset_id
                  ${filters.department_id ? 'WHERE a.department_id = $1' : ''}`, filters.department_id ? [filters.department_id] : []),
      pool.query(`SELECT
                    COUNT(*) FILTER (WHERE sr.affected_asset_id IS NOT NULL) AS linked_tickets,
                    COUNT(*) FILTER (WHERE sr.affected_asset_id IS NULL) AS unlinked_tickets
                  FROM service_requests sr
                  ${ticketWhere}`, ticketParams),
      pool.query(`SELECT
                    COUNT(*) FILTER (WHERE status = 'published') AS published,
                    COUNT(*) FILTER (WHERE status = 'draft') AS draft,
                    COUNT(*) FILTER (WHERE status = 'in_review') AS in_review,
                    COUNT(*) FILTER (WHERE status = 'archived') AS archived,
                    COALESCE(SUM(helpful_count), 0) AS helpful_feedback,
                    COALESCE(SUM(not_helpful_count), 0) AS not_helpful_feedback,
                    COALESCE(SUM(view_count), 0) AS total_views
                  FROM knowledge_base_articles`),
      pool.query(`SELECT
                    COUNT(*) FILTER (WHERE sr.first_response_at IS NOT NULL AND sr.sla_response_due_at IS NOT NULL AND sr.first_response_at <= sr.sla_response_due_at) AS response_met,
                    COUNT(*) FILTER (WHERE sr.first_response_at IS NOT NULL AND sr.sla_response_due_at IS NOT NULL) AS response_measured,
                    COUNT(*) FILTER (WHERE sr.date_resolved IS NOT NULL AND sr.sla_resolution_due_at IS NOT NULL AND sr.date_resolved <= sr.sla_resolution_due_at) AS resolution_met,
                    COUNT(*) FILTER (WHERE sr.date_resolved IS NOT NULL AND sr.sla_resolution_due_at IS NOT NULL) AS resolution_measured,
                    AVG(EXTRACT(EPOCH FROM (sr.first_response_at - sr.date_submitted)) / 3600.0) FILTER (WHERE sr.first_response_at IS NOT NULL) AS avg_response_hours,
                    AVG(EXTRACT(EPOCH FROM (sr.date_resolved - sr.date_submitted)) / 3600.0) FILTER (WHERE sr.date_resolved IS NOT NULL) AS avg_resolution_hours
                  FROM service_requests sr
                  ${ticketWhere}`, ticketParams),
    ]);

    res.json({
      filters_applied: {
        date_from: filters.date_from ? filters.date_from.toISOString().slice(0, 10) : null,
        date_to: filters.date_to ? filters.date_to.toISOString().slice(0, 10) : null,
        department_id: filters.department_id || null,
        technician_id: filters.technician_id || null,
        category: filters.category || null,
        ticket_type: filters.ticket_type || null,
      },
      assets_by_type: assetsByType.rows,
      assets_by_status: assetsByStatus.rows,
      assets_by_department: assetsByDepartment.rows,
      requests_by_category: requestsByCategory.rows,
      requests_by_priority: requestsByPriority.rows,
      requests_by_status: requestsByStatus.rows,
      monthly_maintenance: monthlyMaintenance.rows,
      technician_workload: technicianWorkload.rows,
      technician_resolutions: technicianResolutions.rows,
      department_stats: departmentStats.rows,
      requests_by_assignment: requestsByAssignment.rows[0],
      overdue_tickets: overdueTickets.rows,
      sla_policy_coverage: slaPolicyCoverage.rows[0],
      maintenance_schedule_health: maintenanceScheduleHealth.rows[0],
      asset_ticket_linkage: assetTicketLinkage.rows[0],
      knowledge_base_analytics: knowledgeBaseAnalytics.rows[0],
      sla_performance: slaPerformance.rows[0],
      scheduled_report_architecture: buildScheduledReportArchitecture(),
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to generate report summary.' });
  }
});

router.get('/tickets', requireAuth, async (req, res) => {
  if (!requireReportAccess(req, res)) return;
  try {
    const filters = parseReportFilters(req.query);
    const clauses = [];
    const params = [];
    applyTicketFilters(filters, { clauses, params, alias: 'sr' });
    const where = buildWhereClause(clauses);
    const { limitParam, offsetParam } = addPagination(params, filters);

    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT sr.ticket_number, sr.subject, sr.category, sr.ticket_type, sr.priority, sr.status,
                sr.date_submitted, sr.date_resolved, sr.expected_completion_at, sr.escalation_count,
                req.full_name AS requester_name, tech.full_name AS technician_name, d.name AS department_name
         FROM service_requests sr
         LEFT JOIN users req ON req.user_id = sr.requester_id
         LEFT JOIN users tech ON tech.user_id = sr.assigned_technician_id
         LEFT JOIN departments d ON d.department_id = sr.department_id
         ${where}
         ORDER BY sr.date_submitted DESC, sr.request_id DESC
         LIMIT $${limitParam} OFFSET $${offsetParam}`,
        params
      ),
      pool.query(`SELECT COUNT(*) AS total FROM service_requests sr ${where}`, params.slice(0, params.length - 2)),
    ]);

    res.json({
      page: filters.page,
      page_size: filters.page_size,
      total: Number(count.rows[0].total || 0),
      rows: rows.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to load ticket report rows.' });
  }
});

router.get('/assets', requireAuth, async (req, res) => {
  if (!requireReportAccess(req, res)) return;
  try {
    const filters = parseReportFilters(req.query);
    const clauses = [];
    const params = [];
    applyAssetFilters(filters, { clauses, params, alias: 'a' });
    const where = buildWhereClause(clauses);
    const { limitParam, offsetParam } = addPagination(params, filters);

    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT a.asset_tag, a.asset_type, a.brand, a.model, a.status, a.condition, a.purchase_date,
                d.name AS department_name, u.full_name AS assigned_staff_name
         FROM assets a
         LEFT JOIN departments d ON d.department_id = a.department_id
         LEFT JOIN users u ON u.user_id = a.assigned_to
         ${where}
         ORDER BY a.date_added DESC, a.asset_id DESC
         LIMIT $${limitParam} OFFSET $${offsetParam}`,
        params
      ),
      pool.query(`SELECT COUNT(*) AS total FROM assets a ${where}`, params.slice(0, params.length - 2)),
    ]);

    res.json({
      page: filters.page,
      page_size: filters.page_size,
      total: Number(count.rows[0].total || 0),
      rows: rows.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to load asset report rows.' });
  }
});

router.get('/maintenance', requireAuth, async (req, res) => {
  if (!requireReportAccess(req, res)) return;
  try {
    const filters = parseReportFilters(req.query);
    const clauses = [];
    const params = [];
    applyMaintenanceFilters(filters, { clauses, params, maintenanceAlias: 'm', assetAlias: 'a' });
    const where = buildWhereClause(clauses);
    const { limitParam, offsetParam } = addPagination(params, filters);

    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT m.maintenance_id, m.maintenance_type, m.problem, m.status, m.cost, m.maintenance_date,
                m.next_due_at, a.asset_tag, a.asset_type, d.name AS department_name, u.full_name AS technician_name
         FROM maintenance m
         JOIN assets a ON a.asset_id = m.asset_id
         LEFT JOIN departments d ON d.department_id = a.department_id
         LEFT JOIN users u ON u.user_id = m.technician_id
         ${where}
         ORDER BY m.maintenance_date DESC, m.maintenance_id DESC
         LIMIT $${limitParam} OFFSET $${offsetParam}`,
        params
      ),
      pool.query(`SELECT COUNT(*) AS total FROM maintenance m JOIN assets a ON a.asset_id = m.asset_id ${where}`, params.slice(0, params.length - 2)),
    ]);

    res.json({
      page: filters.page,
      page_size: filters.page_size,
      total: Number(count.rows[0].total || 0),
      rows: rows.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to load maintenance report rows.' });
  }
});

router.get('/export/assets.csv', requireAuth, async (req, res) => {
  if (!requireReportAccess(req, res)) return;

  try {
    const filters = parseReportFilters(req.query);
    const clauses = [];
    const params = [];
    applyAssetFilters(filters, { clauses, params, alias: 'a' });
    const where = buildWhereClause(clauses);

    const result = await pool.query(
      `SELECT a.asset_tag, a.asset_type, a.brand, a.model, a.serial_number,
              d.name AS department, u.full_name AS assigned_staff, a.status, a.condition,
              a.location, a.purchase_date
       FROM assets a
       LEFT JOIN departments d ON d.department_id = a.department_id
       LEFT JOIN users u ON u.user_id = a.assigned_to
       ${where}
       ORDER BY a.asset_id`,
      params
    );

    const headers = ['Asset Tag', 'Type', 'Brand', 'Model', 'Serial Number', 'Department', 'Assigned Staff', 'Status', 'Condition', 'Location', 'Purchase Date'];
    const rows = result.rows.map((row) => [
      row.asset_tag, row.asset_type, row.brand, row.model, row.serial_number,
      row.department, row.assigned_staff, row.status, row.condition, row.location, row.purchase_date,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${(value ?? '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="assets_report.csv"');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to export assets CSV.' });
  }
});

router.get('/export/service-requests.csv', requireAuth, async (req, res) => {
  if (!requireReportAccess(req, res)) return;

  try {
    const filters = parseReportFilters(req.query);
    const clauses = [];
    const params = [];
    applyTicketFilters(filters, { clauses, params, alias: 'sr' });
    const where = buildWhereClause(clauses);

    const result = await pool.query(
      `SELECT sr.request_id, sr.ticket_number, req.full_name AS requester, d.name AS department, sr.category,
              sr.ticket_type, sr.subject, sr.priority, sr.status, tech.full_name AS technician,
              sr.assignment_notes, sr.expected_completion_at, sr.sla_response_due_at, sr.sla_resolution_due_at,
              sr.escalation_count, sr.date_submitted, sr.date_resolved
       FROM service_requests sr
       LEFT JOIN users req ON req.user_id = sr.requester_id
       LEFT JOIN departments d ON d.department_id = sr.department_id
       LEFT JOIN users tech ON tech.user_id = sr.assigned_technician_id
       ${where}
       ORDER BY sr.request_id`,
      params
    );

    const headers = ['Request ID', 'Ticket Number', 'Requester', 'Department', 'Category', 'Ticket Type', 'Subject', 'Priority', 'Status', 'Technician', 'Assignment Notes', 'Expected Completion', 'Response Due', 'Resolution Due', 'Escalation Count', 'Date Submitted', 'Date Resolved'];
    const rows = result.rows.map((row) => [
      row.request_id, row.ticket_number, row.requester, row.department, row.category, row.ticket_type, row.subject,
      row.priority, row.status, row.technician, row.assignment_notes, row.expected_completion_at,
      row.sla_response_due_at, row.sla_resolution_due_at, row.escalation_count, row.date_submitted, row.date_resolved,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${(value ?? '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="service_requests_report.csv"');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to export request CSV.' });
  }
});

module.exports = router;
