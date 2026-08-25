const { calculateSlaState, isOpenTicketStatus } = require('./sla');
const { emitNotificationEvent } = require('./notificationService');
const { withTransaction } = require('./transactions');

const SLA_MONITOR_DEFAULT_INTERVAL_MINUTES = 15;

async function fetchEscalationRecipients(pool, ticket) {
  const recipientIds = new Set();

  if (ticket.assigned_ict_officer_id) {
    recipientIds.add(Number(ticket.assigned_ict_officer_id));
  }

  const roleResult = await pool.query(
    `SELECT user_id
     FROM users
     WHERE is_active = TRUE
       AND role IN ('admin', 'ict_officer')
       AND ($1::int IS NULL OR department_id = $1 OR role = 'admin')`,
    [ticket.department_id || null]
  );

  for (const row of roleResult.rows) {
    recipientIds.add(Number(row.user_id));
  }

  if (ticket.requester_id) {
    recipientIds.add(Number(ticket.requester_id));
  }

  return [...recipientIds];
}

async function insertEscalationNotifications(client, recipientIds, ticket, reason, type) {
  await emitNotificationEvent(
    {
      type,
      title: `Ticket ${ticket.ticket_number} requires attention`,
      message: reason,
      related_record_type: 'service_request',
      related_record_id: ticket.request_id,
      recipient_user_ids: recipientIds,
      payload: {
        ticket_number: ticket.ticket_number,
        escalation_count: Number(ticket.escalation_count || 0) + 1,
      },
      severity: type === 'ticket_escalated' ? 'error' : 'warning',
      action_url: `/service-requests.html#ticket-${ticket.request_id}`,
      email_subject: `SLA alert: ${ticket.ticket_number}`,
      email_body_text: `${ticket.ticket_number}: ${reason}`,
    },
    client
  );
}

async function monitorSlaBreaches(pool, logAction) {
  const result = await pool.query(
    `SELECT sr.request_id, sr.ticket_number, sr.status, sr.priority, sr.ticket_type, sr.requester_id,
            sr.department_id, sr.assigned_technician_id, sr.assigned_ict_officer_id,
            sr.sla_response_due_at, sr.sla_resolution_due_at, sr.expected_completion_at,
            sr.first_response_at, sr.response_escalated_at, sr.resolution_escalated_at,
            sr.last_escalated_at, sr.escalation_count
     FROM service_requests sr
     WHERE sr.is_archived = FALSE
       AND sr.status <> 'Cancelled'`
  );

  let escalatedCount = 0;

  for (const ticket of result.rows) {
    if (!isOpenTicketStatus(ticket.status) && ticket.status !== 'Resolved') {
      continue;
    }

    const slaState = calculateSlaState(ticket, new Date());
    const shouldEscalateResponse = slaState.responseOverdue && !ticket.response_escalated_at;
    const shouldEscalateResolution = slaState.resolutionOverdue && !ticket.resolution_escalated_at;

    if (!shouldEscalateResponse && !shouldEscalateResolution) {
      continue;
    }

    const recipients = await fetchEscalationRecipients(pool, ticket);
    const reasons = [];
    if (shouldEscalateResponse) {
      reasons.push('Response SLA has been breached.');
    }
    if (shouldEscalateResolution) {
      reasons.push('Resolution SLA has been breached.');
    }
    if (slaState.expectedCompletionOverdue) {
      reasons.push('Expected completion date has passed.');
    }
    const reasonText = reasons.join(' ');

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE service_requests
         SET response_escalated_at = CASE WHEN $1 THEN NOW() ELSE response_escalated_at END,
             resolution_escalated_at = CASE WHEN $2 THEN NOW() ELSE resolution_escalated_at END,
             last_escalated_at = NOW(),
             escalation_count = escalation_count + 1
         WHERE request_id = $3`,
        [shouldEscalateResponse, shouldEscalateResolution, ticket.request_id]
      );

      await client.query(
        `INSERT INTO ticket_history
          (request_id, actor_user_id, event_type, from_status, to_status, details)
         VALUES ($1,NULL,'escalated',$2,$2,$3)`,
        [ticket.request_id, ticket.status, reasonText]
      );

      await insertEscalationNotifications(
        client,
        recipients,
        ticket,
        reasonText,
        shouldEscalateResolution ? 'ticket_escalated' : 'ticket_overdue'
      );

      if (logAction) {
        await logAction(
          null,
          'Ticket escalated',
          'service_request',
          ticket.request_id,
          `${ticket.ticket_number}: ${reasonText}`,
          client
        );
      }
      escalatedCount += 1;
    }, pool);
  }

  return escalatedCount;
}

function startSlaMonitor({ pool, logAction }) {
  const intervalMinutes = Number(
    process.env.SLA_MONITOR_INTERVAL_MINUTES || SLA_MONITOR_DEFAULT_INTERVAL_MINUTES
  );
  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
    return () => {};
  }

  const runSweep = async () => {
    try {
      await monitorSlaBreaches(pool, logAction);
    } catch (err) {
      console.error('[sla] Failed to process SLA monitor sweep:', err.message);
    }
  };

  if (String(process.env.SLA_MONITOR_ON_START || 'true').toLowerCase() !== 'false') {
    runSweep();
  }

  const timer = setInterval(runSweep, intervalMinutes * 60 * 1000);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return () => clearInterval(timer);
}

module.exports = {
  SLA_MONITOR_DEFAULT_INTERVAL_MINUTES,
  monitorSlaBreaches,
  startSlaMonitor,
};
