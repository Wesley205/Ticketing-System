const { calculateSlaState, isOpenTicketStatus } = require('./sla');
const { emitNotificationEvent } = require('./notificationService');
const { processBrowserPushQueue } = require('./notificationProcessor');
const { withTransaction } = require('./transactions');
const { runExclusiveJob } = require('./jobRunner');

const SLA_MONITOR_DEFAULT_INTERVAL_MINUTES = 15;

function getSlaWarningThresholds() {
  const values = String(process.env.SLA_WARNING_THRESHOLDS || "50,75,90")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0 && value < 100);
  return [...new Set(values)].sort((left, right) => left - right);
}

async function fetchEscalationRecipients(pool, ticket) {
  const recipientIds = new Set();

  if (ticket.assigned_ict_officer_id) {
    recipientIds.add(Number(ticket.assigned_ict_officer_id));
  }

  if (ticket.assigned_technician_id) {
    recipientIds.add(Number(ticket.assigned_technician_id));
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

function warningReason(ticket, slaState) {
  const reasons = [];
  if (slaState.responseWarningLevel > Number(ticket.response_warning_level || 0)) {
    reasons.push(`Response SLA has reached ${slaState.responseWarningLevel}% of its allowed time.`);
  }
  if (slaState.resolutionWarningLevel > Number(ticket.resolution_warning_level || 0)) {
    reasons.push(`Resolution SLA has reached ${slaState.resolutionWarningLevel}% of its allowed time.`);
  }
  if (slaState.expectedCompletionWarningLevel > Number(ticket.expected_completion_warning_level || 0)) {
    reasons.push(`The assigned completion target has reached ${slaState.expectedCompletionWarningLevel}% of its allowed time.`);
  }
  return reasons;
}

async function insertWarningNotifications(client, recipientIds, ticket, reason, slaState) {
  await emitNotificationEvent(
    {
      type: 'ticket_sla_warning',
      title: `SLA warning: ${ticket.ticket_number}`,
      message: reason,
      related_record_type: 'service_request',
      related_record_id: ticket.request_id,
      recipient_user_ids: recipientIds,
      payload: {
        ticket_number: ticket.ticket_number,
        response_due_at: ticket.sla_response_due_at,
        resolution_due_at: ticket.sla_resolution_due_at,
        expected_completion_at: ticket.expected_completion_at,
        warning_level: Math.max(
          slaState.responseWarningLevel || 0,
          slaState.resolutionWarningLevel || 0,
          slaState.expectedCompletionWarningLevel || 0
        ),
      },
      severity: 'warning',
      action_url: `/service-requests/${ticket.request_id}`,
      email_subject: `SLA warning: ${ticket.ticket_number}`,
      email_body_text: `${ticket.ticket_number}: ${reason}`,
    },
    client
  );
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
      action_url: `/service-requests/${ticket.request_id}`,
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
            sr.date_submitted, sr.assigned_at,
            sr.first_response_at, sr.response_escalated_at, sr.resolution_escalated_at,
            sr.response_warning_sent_at, sr.resolution_warning_sent_at,
            sr.response_warning_level, sr.resolution_warning_level,
            sr.expected_completion_warning_sent_at, sr.expected_completion_warning_level,
            sr.expected_completion_escalated_at,
            sr.last_escalated_at, sr.escalation_count
     FROM service_requests sr
     WHERE sr.is_archived = FALSE
       AND sr.status <> 'Cancelled'`
  );

  let processedCount = 0;

  for (const ticket of result.rows) {
    if (!isOpenTicketStatus(ticket.status) && ticket.status !== 'Resolved') {
      continue;
    }

    const slaState = calculateSlaState(ticket, new Date(), {
      warningThresholds: getSlaWarningThresholds(),
    });
    const warningReasons = warningReason(ticket, slaState);
    const shouldEscalateResponse = slaState.responseOverdue && !ticket.response_escalated_at;
    const shouldEscalateResolution = slaState.resolutionOverdue && !ticket.resolution_escalated_at;
    const shouldEscalateExpectedCompletion =
      slaState.expectedCompletionOverdue && !ticket.expected_completion_escalated_at;

    if (
      warningReasons.length === 0 &&
      !shouldEscalateResponse &&
      !shouldEscalateResolution &&
      !shouldEscalateExpectedCompletion
    ) {
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
    if (shouldEscalateExpectedCompletion) {
      reasons.push('Expected completion date has passed.');
    }
    const reasonText = reasons.join(' ');
    const warningText = warningReasons.join(' ');

    await withTransaction(async (client) => {
      if (warningReasons.length > 0) {
        await client.query(
          `UPDATE service_requests
           SET response_warning_sent_at = CASE
                 WHEN $1 > response_warning_level THEN NOW()
                 ELSE response_warning_sent_at
               END,
               resolution_warning_sent_at = CASE
                 WHEN $2 > resolution_warning_level THEN NOW()
                 ELSE resolution_warning_sent_at
               END,
               expected_completion_warning_sent_at = CASE
                 WHEN $3 > expected_completion_warning_level THEN NOW()
                 ELSE expected_completion_warning_sent_at
               END,
               response_warning_level = GREATEST(response_warning_level, $1),
               resolution_warning_level = GREATEST(resolution_warning_level, $2),
               expected_completion_warning_level = GREATEST(expected_completion_warning_level, $3)
           WHERE request_id = $4`,
          [
            slaState.responseWarningLevel,
            slaState.resolutionWarningLevel,
            slaState.expectedCompletionWarningLevel,
            ticket.request_id,
          ]
        );
        await insertWarningNotifications(client, recipients, ticket, warningText, slaState);
      }

      if (!reasonText) {
        processedCount += 1;
        return;
      }

      await client.query(
        `UPDATE service_requests
         SET response_escalated_at = CASE WHEN $1 THEN NOW() ELSE response_escalated_at END,
             resolution_escalated_at = CASE WHEN $2 THEN NOW() ELSE resolution_escalated_at END,
             expected_completion_escalated_at = CASE WHEN $3 THEN NOW() ELSE expected_completion_escalated_at END,
             last_escalated_at = NOW(),
             escalation_count = escalation_count + 1
         WHERE request_id = $4`,
        [
          shouldEscalateResponse,
          shouldEscalateResolution,
          shouldEscalateExpectedCompletion,
          ticket.request_id,
        ]
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
      processedCount += 1;
    }, pool);

    try {
      await processBrowserPushQueue(pool, { limit: 50 });
    } catch (err) {
      console.error('[sla] Browser warning dispatch will retry from the queue:', err.message);
    }
  }

  return processedCount;
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
      await runExclusiveJob({
        pool,
        jobName: 'sla_monitor',
        task: () => monitorSlaBreaches(pool, logAction),
      });
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
  getSlaWarningThresholds,
  monitorSlaBreaches,
  runExclusiveJob,
  startSlaMonitor,
};
