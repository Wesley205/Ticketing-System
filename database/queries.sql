-- SAMPLE / USEFUL QUERIES
-- NSC ICT Service Desk and Asset Management System

-- 1. Dashboard: total & status breakdown of assets
SELECT COUNT(*) AS total_assets FROM assets;

SELECT status, COUNT(*) AS count
FROM assets
GROUP BY status
ORDER BY count DESC;

-- 2. Dashboard: service request breakdown
SELECT status, COUNT(*) AS count
FROM service_requests
GROUP BY status;

-- 3. Total staff and technicians
SELECT
  COUNT(*) FILTER (WHERE role = 'staff') AS total_staff,
  COUNT(*) FILTER (WHERE role = 'technician') AS total_technicians
FROM users
WHERE is_active = TRUE;

-- 4. Assets by department
SELECT d.name AS department, COUNT(a.asset_id) AS total_assets
FROM departments d
LEFT JOIN assets a ON a.department_id = d.department_id
GROUP BY d.name
ORDER BY total_assets DESC;

-- 5. Assets by type
SELECT asset_type, COUNT(*) AS total
FROM assets
GROUP BY asset_type
ORDER BY total DESC;

-- 6. Service requests by category / priority
SELECT category, priority, COUNT(*) AS total
FROM service_requests
GROUP BY category, priority
ORDER BY category;

-- 7. Technician workload (open requests currently assigned)
SELECT u.full_name AS technician, COUNT(sr.request_id) AS open_requests
FROM users u
LEFT JOIN service_requests sr
  ON sr.assigned_technician_id = u.user_id
  AND sr.status IN ('Assigned','In Progress')
WHERE u.role = 'technician'
GROUP BY u.full_name
ORDER BY open_requests DESC;

-- 8. Technician resolution statistics
SELECT u.full_name AS technician,
       COUNT(*) FILTER (WHERE sr.status = 'Resolved' OR sr.status = 'Closed') AS resolved_count,
       ROUND(AVG(EXTRACT(EPOCH FROM (sr.date_resolved - sr.date_submitted)) / 3600)::numeric, 1) AS avg_resolution_hours
FROM users u
JOIN service_requests sr ON sr.assigned_technician_id = u.user_id
WHERE u.role = 'technician'
GROUP BY u.full_name;

-- 9. Full asset maintenance history for a given asset
SELECT m.maintenance_id, m.problem, m.action_taken, m.maintenance_date,
       m.cost, m.status, u.full_name AS technician
FROM maintenance m
LEFT JOIN users u ON u.user_id = m.technician_id
WHERE m.asset_id = 1
ORDER BY m.maintenance_date DESC;

-- 10. Monthly maintenance cost report
SELECT DATE_TRUNC('month', maintenance_date) AS month,
       COUNT(*) AS total_records,
       SUM(cost) AS total_cost
FROM maintenance
GROUP BY month
ORDER BY month DESC;

-- 11. Department-level statistics (assets + requests)
SELECT d.name,
       (SELECT COUNT(*) FROM assets a WHERE a.department_id = d.department_id) AS total_assets,
       (SELECT COUNT(*) FROM service_requests sr WHERE sr.department_id = d.department_id) AS total_requests
FROM departments d;

-- 12. Recent audit trail
SELECT al.log_id, u.full_name AS "user", al.action, al.record_type, al.record_id, al.created_at
FROM audit_logs al
LEFT JOIN users u ON u.user_id = al.user_id
ORDER BY al.created_at DESC
LIMIT 50;

-- 13. UPDATE example: change an asset's status
UPDATE assets SET status = 'Under Maintenance' WHERE asset_id = 7;

-- 14. DELETE example: remove a retired asset permanently (admin only, use with caution)
-- DELETE FROM assets WHERE asset_id = 18 AND status = 'Retired';

-- 15. Reassign an asset to a different staff member
UPDATE assets SET assigned_to = 9, status = 'Assigned' WHERE asset_id = 4;
