function buildDepartmentListQuery(user) {
  const params = [];
  let where = '';

  if (!user.can_view_all_operational_data) {
    params.push(user.department_id || -1);
    where = `WHERE d.department_id = $${params.length}`;
  }

  return {
    sql: `
      SELECT d.*,
        (SELECT COUNT(*) FROM users u WHERE u.department_id = d.department_id) AS staff_count,
        (SELECT COUNT(*) FROM assets a WHERE a.department_id = d.department_id) AS asset_count,
        (SELECT COUNT(*) FROM service_requests sr WHERE sr.department_id = d.department_id) AS request_count
      FROM departments d
      ${where}
      ORDER BY d.name
    `,
    params,
  };
}

async function listDepartments(executor, userScope) {
  const query = buildDepartmentListQuery(userScope);
  const result = await executor.query(query.sql, query.params);
  return result.rows;
}

async function findDepartmentById(executor, departmentId) {
  const result = await executor.query(
    'SELECT * FROM departments WHERE department_id = $1',
    [departmentId]
  );
  return result.rows[0] || null;
}

async function listDepartmentStaff(executor, departmentId) {
  const result = await executor.query(
    'SELECT user_id, full_name, role FROM users WHERE department_id = $1 ORDER BY full_name',
    [departmentId]
  );
  return result.rows;
}

async function listDepartmentAssets(executor, departmentId) {
  const result = await executor.query(
    'SELECT asset_id, asset_tag, asset_type, status FROM assets WHERE department_id = $1 ORDER BY asset_tag',
    [departmentId]
  );
  return result.rows;
}

async function listDepartmentServiceRequests(executor, departmentId) {
  const result = await executor.query(
    'SELECT request_id, subject, status, priority, date_submitted FROM service_requests WHERE department_id = $1 ORDER BY date_submitted DESC',
    [departmentId]
  );
  return result.rows;
}

async function insertDepartment(client, { name, description }) {
  const result = await client.query(
    'INSERT INTO departments (name, description) VALUES ($1,$2) RETURNING *',
    [name, description || null]
  );
  return result.rows[0] || null;
}

async function updateDepartment(client, { departmentId, name, description }) {
  const result = await client.query(
    'UPDATE departments SET name = COALESCE($1, name), description = $2 WHERE department_id = $3 RETURNING *',
    [name, description || null, departmentId]
  );
  return result.rows[0] || null;
}

module.exports = {
  buildDepartmentListQuery,
  findDepartmentById,
  insertDepartment,
  listDepartmentAssets,
  listDepartmentServiceRequests,
  listDepartmentStaff,
  listDepartments,
  updateDepartment,
};
