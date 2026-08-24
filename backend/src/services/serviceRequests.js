const { withTransaction } = require('../utils/transactions');
const { logAction } = require('../utils/audit');

function buildTicketNumber(requestId, date = new Date()) {
  const year = date.getFullYear();
  return `NSC-${year}-${String(requestId).padStart(5, '0')}`;
}

async function createServiceRequestRecord(data) {
  return withTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO service_requests
        (requester_id, department_id, category, subject, description, priority, ticket_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        data.requester_id,
        data.department_id || null,
        data.category,
        data.subject,
        data.description,
        data.priority || 'Medium',
        data.ticket_type || 'Incident',
      ]
    );

    const request = inserted.rows[0];
    const ticketNumber = buildTicketNumber(request.request_id, request.date_submitted || request.created_at || new Date());

    const updated = await client.query(
      `UPDATE service_requests
       SET ticket_number = $1, status_changed_at = COALESCE(status_changed_at, NOW())
       WHERE request_id = $2
       RETURNING *`,
      [ticketNumber, request.request_id]
    );

    await client.query(
      `INSERT INTO ticket_history (request_id, actor_user_id, event_type, to_status, details)
       VALUES ($1,$2,'created',$3,$4)`,
      [request.request_id, data.requester_id, updated.rows[0].status, data.subject]
    );

    await logAction(data.requester_id, 'Service request created', 'service_request', request.request_id, data.subject, client);

    return updated.rows[0];
  });
}

async function assignServiceRequestRecord(requestId, assignedTechnicianId, actorUserId) {
  return withTransaction(async (client) => {
    const existing = await client.query(
      'SELECT request_id, status, assigned_technician_id, requester_id FROM service_requests WHERE request_id = $1 FOR UPDATE',
      [requestId]
    );
    if (existing.rows.length === 0) return null;

    const previous = existing.rows[0];
    const updated = await client.query(
      `UPDATE service_requests
       SET assigned_technician_id = $1,
           status = 'Assigned',
           status_changed_at = NOW()
       WHERE request_id = $2
       RETURNING *`,
      [assignedTechnicianId, requestId]
    );

    await client.query(
      `INSERT INTO ticket_history (request_id, actor_user_id, event_type, from_status, to_status, details)
       VALUES ($1,$2,$3,$4,'Assigned',$5)`,
      [
        requestId,
        actorUserId,
        previous.assigned_technician_id ? 'reassigned' : 'assigned',
        previous.status,
        `Assigned technician_id ${assignedTechnicianId}`,
      ]
    );

    await client.query(
      `INSERT INTO notifications (recipient_user_id, notification_type, title, message, related_record_type, related_record_id)
       VALUES ($1,'ticket_assigned',$2,$3,'service_request',$4)`,
      [
        assignedTechnicianId,
        'Ticket assigned',
        `You have been assigned ticket ${updated.rows[0].ticket_number || requestId}.`,
        requestId,
      ]
    );

    await logAction(actorUserId, 'Technician assigned', 'service_request', requestId, `Assigned technician_id ${assignedTechnicianId}`, client);

    return updated.rows[0];
  });
}

async function updateServiceRequestStatusRecord(requestId, status, resolution, actorUserId) {
  return withTransaction(async (client) => {
    const existing = await client.query(
      'SELECT request_id, status, requester_id, assigned_technician_id FROM service_requests WHERE request_id = $1 FOR UPDATE',
      [requestId]
    );
    if (existing.rows.length === 0) return null;

    const previous = existing.rows[0];
    const resolvedAtSql = (status === 'Resolved' || status === 'Closed') ? 'NOW()' : 'date_resolved';
    const closedAtSql = status === 'Closed' ? 'NOW()' : 'closed_at';

    const updated = await client.query(
      `UPDATE service_requests
       SET status = $1,
           resolution = COALESCE($2, resolution),
           date_resolved = ${resolvedAtSql === 'NOW()' ? 'NOW()' : 'date_resolved'},
           closed_at = ${closedAtSql === 'NOW()' ? 'NOW()' : 'closed_at'},
           closed_by_user_id = CASE WHEN $1 = 'Closed' THEN $3 ELSE closed_by_user_id END,
           status_changed_at = NOW()
       WHERE request_id = $4
       RETURNING *`,
      [status, resolution || null, actorUserId, requestId]
    );

    await client.query(
      `INSERT INTO ticket_history (request_id, actor_user_id, event_type, from_status, to_status, details)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        requestId,
        actorUserId,
        status === 'Resolved' ? 'resolved' : status === 'Closed' ? 'closed' : 'status_changed',
        previous.status,
        status,
        resolution || null,
      ]
    );

    await client.query(
      `INSERT INTO notifications (recipient_user_id, notification_type, title, message, related_record_type, related_record_id)
       VALUES ($1,'ticket_updated',$2,$3,'service_request',$4)`,
      [
        previous.requester_id,
        `Ticket ${updated.rows[0].ticket_number || requestId} updated`,
        `The ticket status is now ${status}.`,
        requestId,
      ]
    );

    await logAction(actorUserId, 'Request status changed', 'service_request', requestId, `Status changed to ${status}`, client);

    return updated.rows[0];
  });
}

module.exports = {
  assignServiceRequestRecord,
  buildTicketNumber,
  createServiceRequestRecord,
  updateServiceRequestStatusRecord,
};
