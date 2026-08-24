const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { canViewAllOperationalData, isTechnician } = require('../utils/authorization');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    if (!canViewAllOperationalData(req.user)) {
      const departmentId = req.user.department_id || -1;
      const [totalAssets, activeAssets, availableAssets, maintenanceAssets, damagedAssets, retiredAssets, totalRequests, pendingRequests, inProgressRequests, resolvedRequests, totalStaff, totalTechnicians] = await Promise.all([
        pool.query('SELECT COUNT(*) AS count FROM assets WHERE assigned_to = $1 OR department_id = $2', [req.user.user_id, departmentId]),
        pool.query("SELECT COUNT(*) AS count FROM assets WHERE status = 'Active' AND (assigned_to = $1 OR department_id = $2)", [req.user.user_id, departmentId]),
        pool.query("SELECT COUNT(*) AS count FROM assets WHERE status = 'Available' AND (assigned_to = $1 OR department_id = $2)", [req.user.user_id, departmentId]),
        pool.query("SELECT COUNT(*) AS count FROM assets WHERE status = 'Under Maintenance' AND (assigned_to = $1 OR department_id = $2)", [req.user.user_id, departmentId]),
        pool.query("SELECT COUNT(*) AS count FROM assets WHERE status = 'Damaged' AND (assigned_to = $1 OR department_id = $2)", [req.user.user_id, departmentId]),
        pool.query("SELECT COUNT(*) AS count FROM assets WHERE status = 'Retired' AND (assigned_to = $1 OR department_id = $2)", [req.user.user_id, departmentId]),
        isTechnician(req.user)
          ? pool.query('SELECT COUNT(*) AS count FROM service_requests WHERE assigned_technician_id = $1', [req.user.user_id])
          : pool.query('SELECT COUNT(*) AS count FROM service_requests WHERE requester_id = $1', [req.user.user_id]),
        isTechnician(req.user)
          ? pool.query("SELECT COUNT(*) AS count FROM service_requests WHERE assigned_technician_id = $1 AND status = 'Pending'", [req.user.user_id])
          : pool.query("SELECT COUNT(*) AS count FROM service_requests WHERE requester_id = $1 AND status = 'Pending'", [req.user.user_id]),
        isTechnician(req.user)
          ? pool.query("SELECT COUNT(*) AS count FROM service_requests WHERE assigned_technician_id = $1 AND status = 'In Progress'", [req.user.user_id])
          : pool.query("SELECT COUNT(*) AS count FROM service_requests WHERE requester_id = $1 AND status = 'In Progress'", [req.user.user_id]),
        isTechnician(req.user)
          ? pool.query("SELECT COUNT(*) AS count FROM service_requests WHERE assigned_technician_id = $1 AND status IN ('Resolved','Closed')", [req.user.user_id])
          : pool.query("SELECT COUNT(*) AS count FROM service_requests WHERE requester_id = $1 AND status IN ('Resolved','Closed')", [req.user.user_id]),
        pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'staff' AND is_active = TRUE AND department_id = $1", [departmentId]),
        pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'technician' AND is_active = TRUE AND department_id = $1", [departmentId]),
      ]);

      return res.json({
        total_assets: Number(totalAssets.rows[0].count),
        active_assets: Number(activeAssets.rows[0].count),
        available_assets: Number(availableAssets.rows[0].count),
        maintenance_assets: Number(maintenanceAssets.rows[0].count),
        damaged_assets: Number(damagedAssets.rows[0].count),
        retired_assets: Number(retiredAssets.rows[0].count),
        total_requests: Number(totalRequests.rows[0].count),
        pending_requests: Number(pendingRequests.rows[0].count),
        in_progress_requests: Number(inProgressRequests.rows[0].count),
        resolved_requests: Number(resolvedRequests.rows[0].count),
        total_staff: Number(totalStaff.rows[0].count),
        total_technicians: Number(totalTechnicians.rows[0].count),
      });
    }

    const [
      totalAssets,
      activeAssets,
      availableAssets,
      maintenanceAssets,
      damagedAssets,
      retiredAssets,
      totalRequests,
      pendingRequests,
      inProgressRequests,
      resolvedRequests,
      totalStaff,
      totalTechnicians,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) AS count FROM assets'),
      pool.query("SELECT COUNT(*) AS count FROM assets WHERE status = 'Active'"),
      pool.query("SELECT COUNT(*) AS count FROM assets WHERE status = 'Available'"),
      pool.query("SELECT COUNT(*) AS count FROM assets WHERE status = 'Under Maintenance'"),
      pool.query("SELECT COUNT(*) AS count FROM assets WHERE status = 'Damaged'"),
      pool.query("SELECT COUNT(*) AS count FROM assets WHERE status = 'Retired'"),
      pool.query('SELECT COUNT(*) AS count FROM service_requests'),
      pool.query("SELECT COUNT(*) AS count FROM service_requests WHERE status = 'Pending'"),
      pool.query("SELECT COUNT(*) AS count FROM service_requests WHERE status = 'In Progress'"),
      pool.query("SELECT COUNT(*) AS count FROM service_requests WHERE status IN ('Resolved','Closed')"),
      pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'staff' AND is_active = TRUE"),
      pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'technician' AND is_active = TRUE"),
    ]);

    res.json({
      total_assets: Number(totalAssets.rows[0].count),
      active_assets: Number(activeAssets.rows[0].count),
      available_assets: Number(availableAssets.rows[0].count),
      maintenance_assets: Number(maintenanceAssets.rows[0].count),
      damaged_assets: Number(damagedAssets.rows[0].count),
      retired_assets: Number(retiredAssets.rows[0].count),
      total_requests: Number(totalRequests.rows[0].count),
      pending_requests: Number(pendingRequests.rows[0].count),
      in_progress_requests: Number(inProgressRequests.rows[0].count),
      resolved_requests: Number(resolvedRequests.rows[0].count),
      total_staff: Number(totalStaff.rows[0].count),
      total_technicians: Number(totalTechnicians.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard statistics.' });
  }
});

module.exports = router;
