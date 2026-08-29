const { constrainServiceRequestVisibility } = require("../../utils/authorization");

const SERVICE_REQUEST_SELECT = `
  SELECT sr.*, req.full_name AS requester_name, d.name AS department_name,
         tech.full_name AS technician_name, officer.full_name AS ict_officer_name
  FROM service_requests sr
  LEFT JOIN users req ON req.user_id = sr.requester_id
  LEFT JOIN departments d ON d.department_id = sr.department_id
  LEFT JOIN users tech ON tech.user_id = sr.assigned_technician_id
  LEFT JOIN users officer ON officer.user_id = sr.assigned_ict_officer_id
`;

function buildListFilters(user, query = {}) {
  const { status, priority, category, ticket_type, mine } = query;
  const clauses = [];
  const params = [];

  constrainServiceRequestVisibility(user, {
    clauses,
    params,
    alias: "sr",
    mine: mine === "true",
  });

  if (status) {
    params.push(status);
    clauses.push(`sr.status = $${params.length}`);
  }
  if (priority) {
    params.push(priority);
    clauses.push(`sr.priority = $${params.length}`);
  }
  if (category) {
    params.push(category);
    clauses.push(`sr.category = $${params.length}`);
  }
  if (ticket_type) {
    params.push(ticket_type);
    clauses.push(`sr.ticket_type = $${params.length}`);
  }

  return {
    params,
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
  };
}

async function listServiceRequests(client, user, query = {}) {
  const { where, params } = buildListFilters(user, query);
  const result = await client.query(
    `${SERVICE_REQUEST_SELECT} ${where} ORDER BY sr.date_submitted DESC`,
    params,
  );
  return result.rows;
}

async function listAssignedToUser(client, userId) {
  const result = await client.query(
    `${SERVICE_REQUEST_SELECT} WHERE sr.assigned_technician_id = $1 ORDER BY sr.date_submitted DESC`,
    [userId],
  );
  return result.rows;
}

async function getAssetForTicket(client, assetId) {
  if (!assetId) return null;
  const result = await client.query(
    `SELECT asset_id, asset_tag, department_id, assigned_to, status, is_archived
     FROM assets
     WHERE asset_id = $1`,
    [assetId],
  );
  return result.rows[0] || null;
}

async function getActiveTechnicianById(client, userId) {
  const result = await client.query(
    `SELECT user_id, role, is_active
     FROM users
     WHERE user_id = $1`,
    [userId],
  );
  const user = result.rows[0] || null;
  if (!user || user.role !== "technician" || !user.is_active) {
    return null;
  }
  return user;
}

module.exports = {
  SERVICE_REQUEST_SELECT,
  getActiveTechnicianById,
  getAssetForTicket,
  listAssignedToUser,
  listServiceRequests,
};
