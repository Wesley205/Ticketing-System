function buildAuditLogListQuery(filters) {
  const clauses = [];
  const params = [];

  if (filters.user_id) {
    params.push(filters.user_id);
    clauses.push(`al.user_id = $${params.length}`);
  }
  if (filters.action) {
    params.push(`%${filters.action}%`);
    clauses.push(`al.action ILIKE $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    clauses.push(`al.created_at >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    clauses.push(`al.created_at <= $${params.length}`);
  }

  params.push(filters.limit);
  const limitParam = params.length;

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    limitParam,
    params,
  };
}

async function listAuditLogs(executor, filters) {
  const query = buildAuditLogListQuery(filters);
  const result = await executor.query(
    `SELECT al.log_id, al.action, al.record_type, al.record_id, al.details, al.created_at,
            u.full_name AS user_name, u.role AS user_role
     FROM audit_logs al
     LEFT JOIN users u ON u.user_id = al.user_id
     ${query.where}
     ORDER BY al.created_at DESC
     LIMIT $${query.limitParam}`,
    query.params
  );

  return result.rows;
}

async function insertAuditLog(executor, entry) {
  await executor.query(
    `INSERT INTO audit_logs (user_id, action, record_type, record_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      entry.user_id || null,
      entry.action,
      entry.record_type || null,
      entry.record_id || null,
      entry.details || null,
    ]
  );
}

module.exports = {
  buildAuditLogListQuery,
  insertAuditLog,
  listAuditLogs,
};
