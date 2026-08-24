const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { canViewReports } = require('../utils/authorization');

const router = express.Router();

// GET /api/reports/summary - all report datasets in one call, powers charts/tables
router.get('/summary', requireAuth, async (req, res) => {
  if (!canViewReports(req.user)) {
    return res.status(403).json({ error: 'You do not have permission to view reports.' });
  }

  try {
    const [
      assetsByType, assetsByStatus, assetsByDepartment,
      requestsByCategory, requestsByPriority, requestsByStatus,
      monthlyMaintenance, technicianWorkload, technicianResolutions, departmentStats,
    ] = await Promise.all([
      pool.query('SELECT asset_type, COUNT(*) AS total FROM assets GROUP BY asset_type ORDER BY total DESC'),
      pool.query('SELECT status, COUNT(*) AS total FROM assets GROUP BY status ORDER BY total DESC'),
      pool.query(`SELECT d.name AS department, COUNT(a.asset_id) AS total
                  FROM departments d LEFT JOIN assets a ON a.department_id = d.department_id
                  GROUP BY d.name ORDER BY total DESC`),
      pool.query('SELECT category, COUNT(*) AS total FROM service_requests GROUP BY category ORDER BY total DESC'),
      pool.query('SELECT priority, COUNT(*) AS total FROM service_requests GROUP BY priority ORDER BY total DESC'),
      pool.query('SELECT status, COUNT(*) AS total FROM service_requests GROUP BY status ORDER BY total DESC'),
      pool.query(`SELECT TO_CHAR(DATE_TRUNC('month', maintenance_date), 'YYYY-MM') AS month,
                         COUNT(*) AS total_records, COALESCE(SUM(cost),0) AS total_cost
                  FROM maintenance GROUP BY month ORDER BY month DESC LIMIT 12`),
      pool.query(`SELECT u.full_name AS technician,
                         COUNT(sr.request_id) FILTER (WHERE sr.status IN ('Assigned','In Progress')) AS open_requests
                  FROM users u LEFT JOIN service_requests sr ON sr.assigned_technician_id = u.user_id
                  WHERE u.role = 'technician' GROUP BY u.full_name ORDER BY open_requests DESC`),
      pool.query(`SELECT u.full_name AS technician,
                         COUNT(*) FILTER (WHERE sr.status IN ('Resolved','Closed')) AS resolved_count
                  FROM users u JOIN service_requests sr ON sr.assigned_technician_id = u.user_id
                  WHERE u.role = 'technician' GROUP BY u.full_name ORDER BY resolved_count DESC`),
      pool.query(`SELECT d.name,
                    (SELECT COUNT(*) FROM assets a WHERE a.department_id = d.department_id) AS total_assets,
                    (SELECT COUNT(*) FROM service_requests sr WHERE sr.department_id = d.department_id) AS total_requests
                  FROM departments d ORDER BY d.name`),
    ]);

    res.json({
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
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate report summary.' });
  }
});

// GET /api/reports/export/assets.csv - CSV export of assets (with optional filters)
router.get('/export/assets.csv', requireAuth, async (req, res) => {
  if (!canViewReports(req.user)) {
    return res.status(403).json({ error: 'You do not have permission to export reports.' });
  }

  const { status, asset_type, department_id } = req.query;
  const clauses = [];
  const params = [];
  if (status) { params.push(status); clauses.push(`a.status = $${params.length}`); }
  if (asset_type) { params.push(asset_type); clauses.push(`a.asset_type = $${params.length}`); }
  if (department_id) { params.push(department_id); clauses.push(`a.department_id = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  try {
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
    const rows = result.rows.map(r => [
      r.asset_tag, r.asset_type, r.brand, r.model, r.serial_number,
      r.department, r.assigned_staff, r.status, r.condition, r.location, r.purchase_date,
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="assets_report.csv"');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export CSV.' });
  }
});

// GET /api/reports/export/service-requests.csv
router.get('/export/service-requests.csv', requireAuth, async (req, res) => {
  if (!canViewReports(req.user)) {
    return res.status(403).json({ error: 'You do not have permission to export reports.' });
  }

  try {
    const result = await pool.query(`
      SELECT sr.request_id, req.full_name AS requester, d.name AS department, sr.category,
             sr.subject, sr.priority, sr.status, tech.full_name AS technician,
             sr.date_submitted, sr.date_resolved
      FROM service_requests sr
      LEFT JOIN users req ON req.user_id = sr.requester_id
      LEFT JOIN departments d ON d.department_id = sr.department_id
      LEFT JOIN users tech ON tech.user_id = sr.assigned_technician_id
      ORDER BY sr.request_id
    `);
    const headers = ['Request ID', 'Requester', 'Department', 'Category', 'Subject', 'Priority', 'Status', 'Technician', 'Date Submitted', 'Date Resolved'];
    const rows = result.rows.map(r => [
      r.request_id, r.requester, r.department, r.category, r.subject,
      r.priority, r.status, r.technician, r.date_submitted, r.date_resolved,
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="service_requests_report.csv"');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export CSV.' });
  }
});

module.exports = router;
