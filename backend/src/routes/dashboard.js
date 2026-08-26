const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { canViewAllOperationalData, isTechnician } = require('../utils/authorization');
const {
  applyAssetFilters,
  applyMaintenanceFilters,
  applyTicketFilters,
  buildWhereClause,
  parseReportFilters,
} = require('../services/reporting');

const router = express.Router();

function parseScopeFilters(user, rawQuery) {
  const filters = parseReportFilters(rawQuery);
  if (!canViewAllOperationalData(user)) {
    filters.department_id = user.department_id || null;
    if (isTechnician(user)) {
      filters.technician_id = user.user_id;
    }
  }
  return filters;
}

router.get('/stats', requireAuth, async (req, res) => {
  try {
    const filters = parseScopeFilters(req.user, req.query);

    const ticketClauses = [];
    const ticketParams = [];
    applyTicketFilters(filters, { clauses: ticketClauses, params: ticketParams, alias: 'sr' });
    if (!canViewAllOperationalData(req.user)) {
      if (isTechnician(req.user)) {
        ticketParams.push(req.user.user_id);
        ticketClauses.push(`sr.assigned_technician_id = $${ticketParams.length}`);
      } else {
        ticketParams.push(req.user.user_id);
        ticketClauses.push(`sr.requester_id = $${ticketParams.length}`);
      }
    }
    const ticketWhere = buildWhereClause(ticketClauses);

    const assetClauses = [];
    const assetParams = [];
    applyAssetFilters(filters, { clauses: assetClauses, params: assetParams, alias: 'a' });
    if (!canViewAllOperationalData(req.user)) {
      assetParams.push(req.user.user_id);
      const selfParam = assetParams.length;
      assetParams.push(req.user.department_id || -1);
      const deptParam = assetParams.length;
      assetClauses.push(`(a.assigned_to = $${selfParam} OR a.department_id = $${deptParam})`);
    }
    const assetWhere = buildWhereClause(assetClauses);

    const maintenanceClauses = [];
    const maintenanceParams = [];
    applyMaintenanceFilters(filters, {
      clauses: maintenanceClauses,
      params: maintenanceParams,
      maintenanceAlias: 'm',
      assetAlias: 'a',
    });
    if (!canViewAllOperationalData(req.user)) {
      if (isTechnician(req.user)) {
        maintenanceParams.push(req.user.user_id);
        const techParam = maintenanceParams.length;
        maintenanceParams.push(req.user.department_id || -1);
        const deptParam = maintenanceParams.length;
        maintenanceClauses.push(`(m.technician_id = $${techParam} OR a.department_id = $${deptParam})`);
      } else {
        maintenanceClauses.push('1 = 0');
      }
    }
    const maintenanceWhere = buildWhereClause(maintenanceClauses);

    const [ticketTotals, ticketStatusRows, ticketPriorityRows, assetTotals, assetStatusRows, maintenanceTotals, technicianRows] = await Promise.all([
      pool.query(
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
         ${ticketWhere}`,
        ticketParams
      ),
      pool.query(
        `SELECT status, COUNT(*) AS total
         FROM service_requests sr
         ${ticketWhere}
         GROUP BY status
         ORDER BY total DESC, status`,
        ticketParams
      ),
      pool.query(
        `SELECT priority, COUNT(*) AS total
         FROM service_requests sr
         ${ticketWhere}
         GROUP BY priority
         ORDER BY total DESC, priority`,
        ticketParams
      ),
      pool.query(
        `SELECT
            COUNT(*) AS total_assets,
            COUNT(*) FILTER (WHERE status = 'Active') AS active_assets,
            COUNT(*) FILTER (WHERE status = 'Available') AS available_assets,
            COUNT(*) FILTER (WHERE status = 'Assigned') AS assigned_assets,
            COUNT(*) FILTER (WHERE status = 'Under Maintenance') AS maintenance_assets,
            COUNT(*) FILTER (WHERE status = 'Damaged') AS damaged_assets,
            COUNT(*) FILTER (WHERE status = 'Retired') AS retired_assets
         FROM assets a
         ${assetWhere}`,
        assetParams
      ),
      pool.query(
        `SELECT status, COUNT(*) AS total
         FROM assets a
         ${assetWhere}
         GROUP BY status
         ORDER BY total DESC, status`,
        assetParams
      ),
      pool.query(
        `SELECT
            COUNT(*) AS total_records,
            COUNT(*) FILTER (WHERE m.status = 'Completed') AS completed_records,
            COUNT(*) FILTER (WHERE m.status IN ('Scheduled','In Progress')) AS open_records,
            COALESCE(SUM(m.cost), 0) AS total_cost,
            COUNT(*) FILTER (WHERE ms.is_active = TRUE AND ms.next_due_at <= NOW()) AS due_schedules
         FROM maintenance m
         JOIN assets a ON a.asset_id = m.asset_id
         LEFT JOIN maintenance_schedules ms ON ms.schedule_id = m.schedule_id
         ${maintenanceWhere}`,
        maintenanceParams
      ),
      canViewAllOperationalData(req.user)
        ? pool.query(
          `SELECT u.user_id, u.full_name AS technician,
                  COUNT(sr.request_id) FILTER (WHERE sr.status IN ('Assigned','Accepted','In Progress','Waiting for User','Waiting for Parts','Reopened')) AS open_requests,
                  COUNT(sr.request_id) FILTER (WHERE sr.status IN ('Resolved','Closed')) AS resolved_requests
           FROM users u
           LEFT JOIN service_requests sr ON sr.assigned_technician_id = u.user_id
           ${filters.department_id ? 'LEFT JOIN departments d ON d.department_id = u.department_id' : ''}
           WHERE u.role = 'technician'
             AND u.is_active = TRUE
             ${filters.department_id ? `AND u.department_id = ${Number(filters.department_id)}` : ''}
           GROUP BY u.user_id, u.full_name
           ORDER BY open_requests DESC, resolved_requests DESC, u.full_name`
        )
        : Promise.resolve({ rows: [] }),
    ]);

    const ticketMetrics = ticketTotals.rows[0];
    const assetMetrics = assetTotals.rows[0];
    const maintenanceMetrics = maintenanceTotals.rows[0];

    res.json({
      filters_applied: {
        date_from: filters.date_from ? filters.date_from.toISOString().slice(0, 10) : null,
        date_to: filters.date_to ? filters.date_to.toISOString().slice(0, 10) : null,
        department_id: filters.department_id || null,
        technician_id: filters.technician_id || null,
        category: filters.category || null,
        ticket_type: filters.ticket_type || null,
      },
      total_assets: Number(assetMetrics.total_assets || 0),
      active_assets: Number(assetMetrics.active_assets || 0),
      available_assets: Number(assetMetrics.available_assets || 0),
      assigned_assets: Number(assetMetrics.assigned_assets || 0),
      maintenance_assets: Number(assetMetrics.maintenance_assets || 0),
      damaged_assets: Number(assetMetrics.damaged_assets || 0),
      retired_assets: Number(assetMetrics.retired_assets || 0),
      due_maintenance_schedules: Number(maintenanceMetrics.due_schedules || 0),
      total_requests: Number(ticketMetrics.total_requests || 0),
      pending_requests: Number(ticketMetrics.pending_requests || 0),
      in_progress_requests: Number(ticketMetrics.in_progress_requests || 0),
      resolved_requests: Number(ticketMetrics.resolved_requests || 0),
      overdue_requests: Number(ticketMetrics.overdue_requests || 0),
      escalated_requests: Number(ticketMetrics.escalated_requests || 0),
      avg_resolution_hours: ticketMetrics.avg_resolution_hours === null ? null : Number(ticketMetrics.avg_resolution_hours),
      response_sla_met_rate: Number(ticketMetrics.response_sla_measured || 0)
        ? Number(ticketMetrics.response_sla_met || 0) / Number(ticketMetrics.response_sla_measured || 0)
        : null,
      resolution_sla_met_rate: Number(ticketMetrics.resolution_sla_measured || 0)
        ? Number(ticketMetrics.resolution_sla_met || 0) / Number(ticketMetrics.resolution_sla_measured || 0)
        : null,
      maintenance_total_cost: Number(maintenanceMetrics.total_cost || 0),
      maintenance_total_records: Number(maintenanceMetrics.total_records || 0),
      maintenance_completed_records: Number(maintenanceMetrics.completed_records || 0),
      tickets_by_status: ticketStatusRows.rows,
      tickets_by_priority: ticketPriorityRows.rows,
      assets_by_status: assetStatusRows.rows,
      technician_workload: technicianRows.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to load dashboard statistics.' });
  }
});

module.exports = router;
