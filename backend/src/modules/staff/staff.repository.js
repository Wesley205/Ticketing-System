const STAFF_SELECT = `
  SELECT u.user_id, u.full_name, u.email, u.username, u.role, u.user_type, u.phone,
         u.is_active, u.account_status, u.created_at, u.last_login_at, u.department_id,
         d.name AS department_name, u.sponsor_name, u.account_start_date,
         u.account_expiration_date, u.deactivated_at, u.deactivation_reason
  FROM users u
  LEFT JOIN departments d ON d.department_id = u.department_id
`;

function buildStaffListQuery(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    clauses.push(`(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.username ILIKE $${params.length})`);
  }
  if (filters.role) {
    params.push(filters.role);
    clauses.push(`u.role = $${params.length}`);
  }
  if (filters.user_type) {
    params.push(filters.user_type);
    clauses.push(`u.user_type = $${params.length}`);
  }
  if (filters.department_id) {
    params.push(filters.department_id);
    clauses.push(`u.department_id = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return {
    sql: `${STAFF_SELECT} ${where} ORDER BY u.full_name`,
    params,
  };
}

async function listStaff(executor, filters = {}) {
  const query = buildStaffListQuery(filters);
  const result = await executor.query(query.sql, query.params);
  return result.rows;
}

async function listTechnicians(executor) {
  const result = await executor.query(
    "SELECT user_id, full_name FROM users WHERE role = 'technician' AND is_active = TRUE ORDER BY full_name"
  );
  return result.rows;
}

async function insertStaffAccount(client, data) {
  const result = await client.query(
    `INSERT INTO users
      (full_name, email, username, password_hash, role, user_type, department_id, phone,
       is_active, account_status, sponsor_name, supervisor_user_id, account_start_date, account_expiration_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,'active',$9,$10,COALESCE($11, CURRENT_DATE),$12)
     RETURNING user_id, full_name, email, username, role, user_type, department_id, phone,
               sponsor_name, account_start_date, account_expiration_date, is_active, account_status`,
    [
      data.full_name,
      data.email,
      data.username,
      data.password_hash,
      data.role,
      data.user_type,
      data.department_id,
      data.phone,
      data.sponsor_name,
      data.supervisor_user_id,
      data.account_start_date,
      data.account_expiration_date,
    ]
  );
  return result.rows[0] || null;
}

async function updateStaffAccount(client, userId, data) {
  const result = await client.query(
    `UPDATE users SET
      full_name = COALESCE($1, full_name),
      email = COALESCE($2, email),
      role = COALESCE($3, role),
      user_type = COALESCE($4, user_type),
      department_id = $5,
      phone = $6,
      sponsor_name = $7,
      supervisor_user_id = $8,
      account_start_date = COALESCE($9, account_start_date),
      account_expiration_date = $10,
      session_version = session_version + 1
     WHERE user_id = $11
     RETURNING user_id, full_name, email, username, role, user_type, department_id, phone,
               sponsor_name, account_start_date, account_expiration_date, is_active, account_status`,
    [
      data.full_name,
      data.email,
      data.role,
      data.user_type,
      data.department_id,
      data.phone,
      data.sponsor_name,
      data.supervisor_user_id,
      data.account_start_date,
      data.account_expiration_date,
      userId,
    ]
  );
  return result.rows[0] || null;
}

async function updateStaffStatus(client, userId, { is_active, deactivation_reason }) {
  const result = await client.query(
    `UPDATE users
     SET is_active = $1,
         account_status = CASE WHEN $1 THEN 'active' ELSE 'deactivated' END,
         deactivated_at = CASE WHEN $1 THEN NULL ELSE NOW() END,
         deactivation_reason = CASE WHEN $1 THEN NULL ELSE $2 END,
         failed_login_attempts = CASE WHEN $1 THEN 0 ELSE failed_login_attempts END,
         locked_until = CASE WHEN $1 THEN NULL ELSE locked_until END,
         session_version = session_version + 1
     WHERE user_id = $3
     RETURNING user_id, full_name, is_active, account_status, deactivation_reason`,
    [!!is_active, deactivation_reason || 'Account deactivated by administrator', userId]
  );
  return result.rows[0] || null;
}

async function extendTemporaryAccount(client, userId, { account_expiration_date }) {
  const result = await client.query(
    `UPDATE users
     SET account_expiration_date = $1,
         is_active = TRUE,
         account_status = 'active',
         deactivated_at = NULL,
         deactivation_reason = NULL,
         failed_login_attempts = 0,
         locked_until = NULL,
         session_version = session_version + 1
     WHERE user_id = $2
     RETURNING user_id, full_name, account_expiration_date, is_active, account_status`,
    [account_expiration_date, userId]
  );
  return result.rows[0] || null;
}

module.exports = {
  buildStaffListQuery,
  insertStaffAccount,
  listStaff,
  listTechnicians,
  updateStaffAccount,
  updateStaffStatus,
  extendTemporaryAccount,
};
