const { withTransaction } = require("../../utils/transactions");
const { logAction } = require("../../utils/audit");
const { emitNotificationEvent } = require("../../utils/notificationService");
const { removeAttachmentFile } = require("../../utils/ticketAttachments");
const {
  buildSlaDeadlinesFromPolicy,
  calculateSlaState,
  selectSlaPolicy,
} = require("../../utils/sla");
const {
  TICKET_PRIORITIES,
  TICKET_SOURCE_CHANNELS,
  TICKET_STATUSES,
  TICKET_TYPES,
} = require("../../shared/constants/domain");

const STATUS_TRANSITIONS = {
  New: ["Pending", "Assigned", "Cancelled"],
  Pending: ["Assigned", "Cancelled"],
  Assigned: ["Accepted", "Pending", "In Progress", "Cancelled"],
  Accepted: ["In Progress"],
  "In Progress": ["Waiting for User", "Waiting for Parts", "Resolved"],
  "Waiting for User": ["In Progress"],
  "Waiting for Parts": ["In Progress"],
  Resolved: ["Closed", "Reopened"],
  Closed: ["Reopened"],
  Reopened: ["Assigned"],
  Cancelled: [],
};

function buildTicketNumber(requestId, date = new Date()) {
  const year = date.getFullYear();
  return `NSC-${year}-${String(requestId).padStart(5, "0")}`;
}

function isOperationalRole(user) {
  return ["admin", "ict_officer", "technician"].includes(user?.role);
}

function actorDisplayName(user) {
  return user?.full_name || user?.username || "A user";
}

function ticketParticipantIds(request, actorUserId, additionalIds = []) {
  return [
    request?.requester_id,
    request?.assigned_technician_id,
    request?.assigned_ict_officer_id,
    ...additionalIds,
  ].filter((value, index, values) => (
    value &&
    Number(value) !== Number(actorUserId) &&
    values.findIndex((candidate) => Number(candidate) === Number(value)) === index
  ));
}

function canActorTransitionStatus(user, request, nextStatus) {
  if (!user || !request) return false;

  if (["admin", "ict_officer"].includes(user.role)) {
    return true;
  }

  const isRequester = Number(request.requester_id) === Number(user.user_id);
  const isAssignedTechnician =
    user.role === "technician" &&
    Number(request.assigned_technician_id) === Number(user.user_id);

  if (isAssignedTechnician) {
    return [
      "Accepted",
      "Pending",
      "In Progress",
      "Waiting for User",
      "Waiting for Parts",
      "Resolved",
    ].includes(nextStatus);
  }

  if (isRequester) {
    if (request.status === "Resolved" && nextStatus === "Closed") return true;
    if (
      ["Resolved", "Closed"].includes(request.status) &&
      nextStatus === "Reopened"
    )
      return true;
  }

  return false;
}

function getAllowedTicketTransitions(user, request) {
  const allowed = STATUS_TRANSITIONS[request?.status] || [];
  return allowed.filter((status) =>
    canActorTransitionStatus(user, request, status),
  );
}

function validateTicketTransition(request, nextStatus, actorUser) {
  if (!TICKET_STATUSES.includes(nextStatus)) {
    return "Invalid ticket status.";
  }
  if (!request) {
    return "Request not found.";
  }
  if (request.status === nextStatus) {
    return "Ticket is already in that status.";
  }
  const allowedNext = STATUS_TRANSITIONS[request.status] || [];
  if (!allowedNext.includes(nextStatus)) {
    return `Tickets cannot move from ${request.status} to ${nextStatus}.`;
  }
  if (!canActorTransitionStatus(actorUser, request, nextStatus)) {
    return "You do not have permission to apply that ticket status transition.";
  }
  return null;
}

async function insertTicketHistory(
  client,
  requestId,
  actorUserId,
  eventType,
  fields = {},
) {
  await client.query(
    `INSERT INTO ticket_history
      (request_id, actor_user_id, event_type, from_status, to_status, details)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      requestId,
      actorUserId || null,
      eventType,
      fields.from_status || null,
      fields.to_status || null,
      fields.details || null,
    ],
  );
}

async function insertNotifications(
  client,
  recipients,
  notificationType,
  title,
  message,
  requestId,
  options = {},
) {
  const actor = options.actor_user;
  const payload = {
    ...(options.payload || {}),
    ...(actor ? {
      actor_user_id: actor.user_id || null,
      actor_name: actorDisplayName(actor),
      actor_role: actor.role || null,
    } : {}),
    ticket_id: Number(requestId),
  };

  await emitNotificationEvent(
    {
      type: notificationType,
      title,
      message,
      related_record_type: "service_request",
      related_record_id: requestId,
      recipient_user_ids: recipients,
      payload,
      severity: options.severity,
      action_url:
        options.action_url || `/service-requests/${requestId}`,
      email_subject: options.email_subject,
      email_body_text: options.email_body_text,
    },
    client,
  );
}

async function fetchActiveSlaPolicies(client) {
  const result = await client.query(
    `SELECT sla_policy_id, name, ticket_type, priority, response_target_hours,
            resolution_target_hours, escalation_threshold_hours, notification_recipients, is_active
     FROM sla_policies
     WHERE is_active = TRUE
     ORDER BY CASE WHEN ticket_type IS NULL THEN 1 ELSE 0 END, priority`,
  );
  return result.rows;
}

async function getServiceRequestById(client, requestId) {
  const result = await client.query(
    `SELECT sr.*, req.full_name AS requester_name,
            req.email AS requester_email,
            d.name AS department_name,
            tech.full_name AS technician_name,
            officer.full_name AS ict_officer_name,
            closer.full_name AS closed_by_name,
            assigner.full_name AS assigned_by_name,
            floor.floor_label,
             catalog.name AS catalog_item_name,
             approver.full_name AS approval_decided_by_name,
            asset.asset_tag AS affected_asset_tag,
            asset.status AS affected_asset_status,
            sp.name AS sla_policy_name,
            sp.response_target_hours,
            sp.resolution_target_hours,
            sp.escalation_threshold_hours
     FROM service_requests sr
     LEFT JOIN users req ON req.user_id = sr.requester_id
     LEFT JOIN users tech ON tech.user_id = sr.assigned_technician_id
     LEFT JOIN users officer ON officer.user_id = sr.assigned_ict_officer_id
     LEFT JOIN users closer ON closer.user_id = sr.closed_by_user_id
     LEFT JOIN users assigner ON assigner.user_id = sr.assigned_by_user_id
     LEFT JOIN departments d ON d.department_id = sr.department_id
     LEFT JOIN floors floor ON floor.floor_id = sr.floor_id
      LEFT JOIN service_catalog_items catalog ON catalog.catalog_item_id = sr.catalog_item_id
      LEFT JOIN users approver ON approver.user_id = sr.approval_decided_by
     LEFT JOIN assets asset ON asset.asset_id = sr.affected_asset_id
     LEFT JOIN sla_policies sp ON sp.sla_policy_id = sr.sla_policy_id
     WHERE sr.request_id = $1`,
    [requestId],
  );
  return result.rows[0] || null;
}

async function loadTicketArtifacts(
  client,
  requestId,
  { includeInternal = false } = {},
) {
  const commentsResult = await client.query(
    `SELECT tc.comment_id, tc.request_id, tc.author_user_id, tc.comment_body, tc.is_internal,
            tc.created_at, tc.updated_at, u.full_name AS author_name
     FROM ticket_comments tc
     LEFT JOIN users u ON u.user_id = tc.author_user_id
     WHERE tc.request_id = $1
       AND tc.deleted_at IS NULL
       AND ($2::boolean = TRUE OR tc.is_internal = FALSE)
     ORDER BY tc.created_at ASC`,
    [requestId, includeInternal],
  );

  const attachmentsResult = await client.query(
    `SELECT ta.attachment_id, ta.request_id, ta.uploaded_by_user_id, ta.file_name, ta.mime_type,
            ta.file_size_bytes, ta.created_at, ta.is_internal, u.full_name AS uploaded_by_name
     FROM ticket_attachments ta
     LEFT JOIN users u ON u.user_id = ta.uploaded_by_user_id
     WHERE ta.request_id = $1
       AND ta.deleted_at IS NULL
       AND ($2::boolean = TRUE OR ta.is_internal = FALSE)
     ORDER BY ta.created_at ASC`,
    [requestId, includeInternal],
  );

  const historyResult = await client.query(
    `SELECT th.history_id, th.request_id, th.actor_user_id, th.event_type, th.from_status,
            th.to_status, th.details, th.created_at, u.full_name AS actor_name
     FROM ticket_history th
     LEFT JOIN users u ON u.user_id = th.actor_user_id
     WHERE th.request_id = $1
     ORDER BY th.created_at ASC, th.history_id ASC`,
    [requestId],
  );

  return {
    attachments: attachmentsResult.rows,
    comments: commentsResult.rows,
    history: historyResult.rows,
  };
}

async function loadAssignmentHistory(client, requestId) {
  const result = await client.query(
    `SELECT ta.ticket_assignment_id, ta.request_id, ta.assignment_notes, ta.assigned_at,
            ta.accepted_at, ta.expected_completion_at, ta.ended_at, ta.end_reason, ta.is_active,
            tech.full_name AS technician_name,
            officer.full_name AS ict_officer_name,
            assigner.full_name AS assigned_by_name
     FROM ticket_assignments ta
     LEFT JOIN users tech ON tech.user_id = ta.assigned_technician_id
     LEFT JOIN users officer ON officer.user_id = ta.assigned_ict_officer_id
     LEFT JOIN users assigner ON assigner.user_id = ta.assigned_by_user_id
     WHERE ta.request_id = $1
     ORDER BY ta.assigned_at DESC, ta.ticket_assignment_id DESC`,
    [requestId],
  );
  return result.rows;
}

function buildSlaSummary(request) {
  return {
    policy_id: request.sla_policy_id,
    policy_name: request.sla_policy_name || null,
    response_target_hours: request.response_target_hours || null,
    resolution_target_hours: request.resolution_target_hours || null,
    escalation_threshold_hours: request.escalation_threshold_hours || null,
    response_due_at: request.sla_response_due_at || null,
    resolution_due_at: request.sla_resolution_due_at || null,
    response_escalated_at: request.response_escalated_at || null,
    resolution_escalated_at: request.resolution_escalated_at || null,
    response_warning_sent_at: request.response_warning_sent_at || null,
    resolution_warning_sent_at: request.resolution_warning_sent_at || null,
    response_warning_level: Number(request.response_warning_level || 0),
    resolution_warning_level: Number(request.resolution_warning_level || 0),
    expected_completion_warning_sent_at: request.expected_completion_warning_sent_at || null,
    expected_completion_warning_level: Number(request.expected_completion_warning_level || 0),
    expected_completion_escalated_at: request.expected_completion_escalated_at || null,
    last_escalated_at: request.last_escalated_at || null,
    escalation_count: request.escalation_count || 0,
    ...calculateSlaState(request),
  };
}

async function getServiceRequestDetails(client, requestId, actorUser) {
  const request = await getServiceRequestById(client, requestId);
  if (!request) return null;

  const includeInternal =
    isOperationalRole(actorUser) &&
    (["admin", "ict_officer"].includes(actorUser.role) ||
      Number(request.assigned_technician_id) === Number(actorUser.user_id));

  const [artifacts, assignmentHistory] = await Promise.all([
    loadTicketArtifacts(client, requestId, { includeInternal }),
    loadAssignmentHistory(client, requestId),
  ]);

  return {
    ...request,
    ...artifacts,
    allowed_status_transitions: getAllowedTicketTransitions(actorUser, request),
    assignment_history: assignmentHistory,
    sla: buildSlaSummary(request),
  };
}

async function createServiceRequestRecord(data) {
  return withTransaction(async (client) => {
    const policies = await fetchActiveSlaPolicies(client);
    const selectedPolicy = selectSlaPolicy(policies, {
      priority: data.priority || "Medium",
      ticket_type: data.ticket_type || "Incident",
    });
    const deadlines = buildSlaDeadlinesFromPolicy(selectedPolicy, new Date());

    const idResult = await client.query(
      `SELECT nextval(pg_get_serial_sequence('service_requests', 'request_id')) AS request_id`,
    );

    const requestId = Number(idResult.rows[0].request_id);
    const now = new Date();
    const ticketNumber = buildTicketNumber(requestId, now);
    const initialStatus = data.approval_status === "pending" ? "Pending" : "New";

    const inserted = await client.query(
      `INSERT INTO service_requests
        (request_id, ticket_number, requester_id, department_id, category, subject, description, priority, ticket_type,
     subcategory, impact, urgency, source_channel, affected_asset_id, floor_id,
     catalog_item_id, catalog_responses, approval_status, approval_role,
     closure_confirmation_required, status, sla_policy_id, sla_response_due_at, sla_resolution_due_at,
     status_changed_at)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,NOW())
   RETURNING *`,
      [
        requestId,
        ticketNumber,
        data.requester_id,
        data.department_id || null,
        data.category,
        data.subject,
        data.description,
        data.priority || "Medium",
        data.ticket_type || "Incident",
        data.subcategory || null,
        data.impact || data.priority || "Medium",
        data.urgency || data.priority || "Medium",
        data.source_channel || "portal",
        data.affected_asset_id || null,
        data.floor_id || null,
        data.catalog_item_id || null,
        JSON.stringify(data.catalog_responses || {}),
        data.approval_status || "not_required",
        data.approval_role || null,
        !!data.closure_confirmation_required,
        initialStatus,
        selectedPolicy?.sla_policy_id || null,
        deadlines.responseDueAt,
        deadlines.resolutionDueAt,
      ],
    );

    const request = inserted.rows[0];

    await insertTicketHistory(
      client,
      request.request_id,
      data.requester_id,
      "created",
      {
        to_status: initialStatus,
        details: `${data.ticket_type || "Incident"}: ${data.subject}`,
      },
    );

    await logAction(
      data.requester_id,
      "Service request created",
      "service_request",
      request.request_id,
      `${ticketNumber} created`,
      client,
    );

    if (data.approval_status === "pending") {
      await insertTicketHistory(client, request.request_id, data.requester_id, "approval_requested", {
        from_status: initialStatus,
        to_status: initialStatus,
        details: `Approval requested from ${data.approval_role}.`,
      });
      const approvers = await client.query(
        `SELECT user_id FROM users
         WHERE is_active = TRUE
           AND (role = $1 OR role = 'admin')`,
        [data.approval_role],
      );
      await insertNotifications(
        client,
        approvers.rows.map((row) => row.user_id),
        "approval_requested",
        `Approval required: ${ticketNumber}`,
        `${data.requester_name || "A requester"} submitted ${data.subject} for approval.`,
        request.request_id,
        {
          severity: "warning",
          actor_user: {
            user_id: data.requester_id,
            full_name: data.requester_name,
            role: data.requester_role,
          },
          payload: { change_type: "approval_requested" },
        },
      );
    }

    return getServiceRequestDetails(client, request.request_id, {
      user_id: data.requester_id,
      role: data.requester_role || "staff",
    });
  });
}

async function decideServiceRequestApprovalRecord(requestId, actorUser, decision) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `SELECT request_id, ticket_number, subject, requester_id, status, approval_status, approval_role
       FROM service_requests
       WHERE request_id = $1
       FOR UPDATE`,
      [requestId],
    );
    const request = result.rows[0];
    if (!request) {
      const error = new Error("Request not found.");
      error.statusCode = 404;
      throw error;
    }
    if (request.approval_status !== "pending") {
      const error = new Error("This request is not awaiting approval.");
      error.statusCode = 400;
      throw error;
    }
    if (actorUser.role !== "admin" && actorUser.role !== request.approval_role) {
      const error = new Error("You do not have permission to approve this request.");
      error.statusCode = 403;
      throw error;
    }

    const approvalStatus = decision.decision;
    const nextStatus = approvalStatus === "rejected" ? "Cancelled" : request.status;
    await client.query(
      `UPDATE service_requests
       SET approval_status = $1,
           approval_decided_by = $2,
           approval_decided_at = NOW(),
           approval_note = $3,
           status = $4,
           status_changed_at = CASE WHEN status <> $4 THEN NOW() ELSE status_changed_at END
       WHERE request_id = $5`,
      [approvalStatus, actorUser.user_id, decision.note || null, nextStatus, requestId],
    );

    await insertTicketHistory(client, requestId, actorUser.user_id, approvalStatus === "approved" ? "approved" : "rejected", {
      from_status: request.status,
      to_status: nextStatus,
      details: decision.note || `Request ${approvalStatus}.`,
    });
    await logAction(
      actorUser.user_id,
      approvalStatus === "approved" ? "Service request approved" : "Service request rejected",
      "service_request",
      requestId,
      `${request.ticket_number} ${approvalStatus}`,
      client,
    );
    await insertNotifications(
      client,
      [request.requester_id],
      approvalStatus === "approved" ? "approval_approved" : "approval_rejected",
      `Request ${approvalStatus}: ${request.ticket_number}`,
      `${actorDisplayName(actorUser)} ${approvalStatus} this request.${decision.note ? ` ${decision.note}` : ""}`,
      requestId,
      {
        severity: approvalStatus === "approved" ? "success" : "error",
        actor_user: actorUser,
        payload: { change_type: `approval_${approvalStatus}` },
      },
    );

    return getServiceRequestDetails(client, requestId, actorUser);
  });
}

async function closeActiveAssignment(client, requestId, endReason) {
  await client.query(
    `UPDATE ticket_assignments
     SET is_active = FALSE,
         ended_at = NOW(),
         end_reason = COALESCE($2, end_reason)
     WHERE request_id = $1 AND is_active = TRUE`,
    [requestId, endReason || null],
  );
}

async function createAssignmentHistoryRow(client, requestId, details) {
  await client.query(
    `INSERT INTO ticket_assignments
      (request_id, assigned_technician_id, assigned_ict_officer_id, assigned_by_user_id,
       assignment_notes, assigned_at, accepted_at, expected_completion_at, is_active)
     VALUES ($1,$2,$3,$4,$5,NOW(),$6,$7,TRUE)`,
    [
      requestId,
      details.assigned_technician_id || null,
      details.assigned_ict_officer_id || null,
      details.assigned_by_user_id || null,
      details.assignment_notes || null,
      details.accepted_at || null,
      details.expected_completion_at || null,
    ],
  );
}

async function assignServiceRequestRecord(
  requestId,
  assignedTechnicianId,
  actorUser,
  details = {},
) {
  return withTransaction(async (client) => {
    const existingResult = await client.query(
      `SELECT request_id, ticket_number, status, requester_id, department_id,
              assigned_technician_id, assigned_ict_officer_id
       FROM service_requests
       WHERE request_id = $1
       FOR UPDATE`,
      [requestId],
    );
    if (existingResult.rows.length === 0) return null;

    const previous = existingResult.rows[0];
    if (["Closed", "Cancelled"].includes(previous.status)) {
      throw new Error(`Cannot assign a ticket that is ${previous.status}.`);
    }

    const nextAssignee = assignedTechnicianId
      ? Number(assignedTechnicianId)
      : null;
    const nextStatus = nextAssignee ? "Assigned" : "Pending";
    const assignedIctOfficerId = Number(
      details.assigned_ict_officer_id || actorUser.user_id,
    );

    await closeActiveAssignment(
      client,
      requestId,
      nextAssignee
        ? "Superseded by a newer assignment"
        : "Ticket unassigned by ICT operations",
    );

    const updated = await client.query(
      `UPDATE service_requests
   SET assigned_technician_id = $1::integer,
       assigned_ict_officer_id = $2::integer,
       assigned_by_user_id = CASE WHEN $1::integer IS NULL THEN NULL ELSE $3::integer END,
       assigned_at = CASE WHEN $1::integer IS NULL THEN NULL ELSE NOW() END,
       accepted_at = CASE WHEN $1::integer IS NULL THEN NULL ELSE accepted_at END,
       assignment_notes = $4,
       expected_completion_at = $5,
       expected_completion_warning_sent_at = NULL,
       expected_completion_warning_level = 0,
       expected_completion_escalated_at = NULL,
       status = $6,
       status_changed_at = NOW()
   WHERE request_id = $7::integer
   RETURNING *`,
      [
        nextAssignee,
        nextAssignee
          ? Number(assignedIctOfficerId)
          : previous.assigned_ict_officer_id,
        Number(actorUser.user_id),
        details.assignment_note || null,
        details.expected_completion_at || null,
        nextStatus,
        Number(requestId),
      ],
    );

    if (nextAssignee) {
      await createAssignmentHistoryRow(client, requestId, {
        assigned_technician_id: nextAssignee,
        assigned_ict_officer_id: assignedIctOfficerId,
        assigned_by_user_id: actorUser.user_id,
        assignment_notes: details.assignment_note || null,
        expected_completion_at: details.expected_completion_at || null,
      });
    }

    const eventType = !nextAssignee
      ? "unassigned"
      : previous.assigned_technician_id
        ? "reassigned"
        : "assigned";

    await insertTicketHistory(client, requestId, actorUser.user_id, eventType, {
      from_status: previous.status,
      to_status: nextStatus,
      details:
        details.assignment_note ||
        (nextAssignee
          ? `Assigned technician_id ${nextAssignee}`
          : "Assignment removed"),
    });

    const recipients = ticketParticipantIds(previous, actorUser.user_id, [
      nextAssignee,
      assignedIctOfficerId,
      previous.assigned_technician_id,
    ]);
    await insertNotifications(
      client,
      recipients,
      "ticket_assigned",
      nextAssignee ? "Ticket assignment updated" : "Ticket unassigned",
      nextAssignee
        ? `${actorDisplayName(actorUser)} assigned ticket ${updated.rows[0].ticket_number || requestId}.`
        : `${actorDisplayName(actorUser)} removed the ticket assignment.`,
      requestId,
      {
        payload: {
          change_type: nextAssignee ? "assignment_updated" : "assignment_removed",
          assigned_technician_id: nextAssignee,
          expected_completion_at: details.expected_completion_at || null,
        },
        actor_user: actorUser,
      },
    );

    await logAction(
      actorUser.user_id,
      nextAssignee ? "Technician assigned" : "Ticket unassigned",
      "service_request",
      requestId,
      nextAssignee
        ? `Assigned technician_id ${nextAssignee}`
        : "Removed assignee",
      client,
    );

    return updated.rows[0];
  });
}

async function updateServiceRequestStatusRecord(
  requestId,
  status,
  details,
  actorUser,
) {
  return withTransaction(async (client) => {
    const existingResult = await client.query(
      `SELECT request_id, ticket_number, status, requester_id, assigned_technician_id,
              assigned_ict_officer_id,
              first_response_at, date_resolved, closure_confirmation_required
       FROM service_requests
       WHERE request_id = $1
       FOR UPDATE`,
      [requestId],
    );
    if (existingResult.rows.length === 0) return null;

    const previous = existingResult.rows[0];
    const transitionError = validateTicketTransition(
      previous,
      status,
      actorUser,
    );
    if (transitionError) {
      throw new Error(transitionError);
    }

    const note = details?.note?.trim() || null;
    const resolution = details?.resolution?.trim() || null;

    if (
      ["Resolved", "Closed"].includes(status) &&
      !resolution &&
      !previous.date_resolved
    ) {
      throw new Error(
        "A resolution text is required before resolving or closing a ticket.",
      );
    }
    if (status === "Reopened" && !note) {
      throw new Error("A reopen reason is required.");
    }
    if (status === "Cancelled" && !note) {
      throw new Error("A cancellation reason is required.");
    }
    if (status === "Closed" && actorUser.role === "technician") {
      throw new Error("Technicians cannot close tickets.");
    }

    const shouldSetFirstResponse =
      !previous.first_response_at &&
      Number(actorUser.user_id) !== Number(previous.requester_id);
    const acceptedAt = status === "Accepted" ? new Date() : null;

    const updated = await client.query(
      `UPDATE service_requests
   SET status = $1::varchar,
       resolution = CASE
         WHEN $1::varchar IN ('Resolved', 'Closed') THEN COALESCE($2::text, resolution)
         ELSE resolution
       END,
       resolution_summary = CASE
         WHEN $1::varchar IN ('Resolved', 'Closed') THEN LEFT(COALESCE($2::text, resolution, ''), 255)
         ELSE resolution_summary
       END,
       date_resolved = CASE
         WHEN $1::varchar IN ('Resolved', 'Closed') THEN NOW()
         ELSE date_resolved
       END,
       closed_at = CASE
         WHEN $1::varchar = 'Closed' THEN NOW()
         ELSE closed_at
       END,
       closed_by_user_id = CASE
         WHEN $1::varchar = 'Closed' THEN $3::integer
         ELSE closed_by_user_id
       END,
       first_response_at = CASE
         WHEN $4::boolean THEN NOW()
         ELSE first_response_at
       END,
       accepted_at = CASE
         WHEN $5::timestamp IS NOT NULL THEN $5::timestamp
         ELSE accepted_at
       END,
       closure_confirmed_at = CASE
         WHEN $1::varchar = 'Closed' AND ($6::boolean OR closure_confirmation_required = FALSE) THEN NOW()
         ELSE closure_confirmed_at
       END,
       reopen_reason = CASE
         WHEN $1::varchar = 'Reopened' THEN $7::text
         ELSE reopen_reason
       END,
       cancel_reason = CASE
         WHEN $1::varchar = 'Cancelled' THEN $8::text
         ELSE cancel_reason
       END,
       response_escalated_at = CASE
         WHEN $1::varchar IN ('Resolved', 'Closed') THEN NULL
         ELSE response_escalated_at
       END,
       resolution_escalated_at = CASE
         WHEN $1::varchar IN ('Resolved', 'Closed') THEN NULL
         ELSE resolution_escalated_at
       END,
       status_changed_at = NOW()
   WHERE request_id = $9::integer
   RETURNING *`,
      [
        String(status),
        resolution,
        Number(actorUser.user_id),
        shouldSetFirstResponse,
        acceptedAt,
        Number(actorUser.user_id) === Number(previous.requester_id),
        status === "Reopened" ? note : null,
        status === "Cancelled" ? note : null,
        Number(requestId),
      ],
    );

    if (status === "Accepted") {
      await client.query(
        `UPDATE ticket_assignments
         SET accepted_at = COALESCE(accepted_at, NOW())
        WHERE request_id = $1::integer AND is_active = TRUE`,
        [requestId],
      );
    }

    const eventType =
      status === "Resolved"
        ? "resolved"
        : status === "Closed"
          ? "closed"
          : status === "Reopened"
            ? "reopened"
            : status === "Accepted"
              ? "accepted"
              : "status_changed";

    await insertTicketHistory(client, requestId, actorUser.user_id, eventType, {
      from_status: previous.status,
      to_status: status,
      details: note || resolution || null,
    });

    await insertNotifications(
      client,
      ticketParticipantIds(previous, actorUser.user_id),
      status === "Resolved" ? "ticket_resolved" : "ticket_updated",
      `Ticket ${updated.rows[0].ticket_number || requestId} updated`,
      `${actorDisplayName(actorUser)} changed the status from ${previous.status} to ${status}.`,
      requestId,
      {
        actor_user: actorUser,
        payload: {
          change_type: "status_changed",
          previous_status: previous.status,
          status,
        },
      },
    );

    await logAction(
      actorUser.user_id,
      "Request status changed",
      "service_request",
      requestId,
      `Status changed from ${previous.status} to ${status}`,
      client,
    );

    return updated.rows[0];
  });
}

async function addTicketCommentRecord(requestId, actorUser, body, isInternal) {
  return withTransaction(async (client) => {
    const request = await getServiceRequestById(client, requestId);
    if (!request) return null;

    const result = await client.query(
      `INSERT INTO ticket_comments (request_id, author_user_id, comment_body, is_internal)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [requestId, actorUser.user_id, body.trim(), !!isInternal],
    );

    if (
      !request.first_response_at &&
      Number(actorUser.user_id) !== Number(request.requester_id)
    ) {
      await client.query(
        `UPDATE service_requests
         SET first_response_at = NOW()
         WHERE request_id = $1`,
        [requestId],
      );
    }

    await insertTicketHistory(
      client,
      requestId,
      actorUser.user_id,
      "comment_added",
      {
        details: isInternal ? "Internal note added" : "Public comment added",
      },
    );

    if (!isInternal) {
      await insertNotifications(
        client,
        ticketParticipantIds(request, actorUser.user_id),
        "ticket_comment",
        `New comment on ${request.ticket_number || `ticket ${requestId}`}`,
        `${actorUser.full_name || "A user"} added a comment.`,
        requestId,
        {
          actor_user: actorUser,
          payload: { change_type: "comment_added", is_internal: false },
        },
      );
    }

    await logAction(
      actorUser.user_id,
      isInternal ? "Internal ticket note added" : "Ticket comment added",
      "service_request",
      requestId,
      body.trim().slice(0, 255),
      client,
    );

    return result.rows[0];
  });
}

async function addTicketAttachmentRecord(requestId, actorUser, attachment) {
  return withTransaction(async (client) => {
    const request = await getServiceRequestById(client, requestId);
    if (!request) return null;

    const inserted = await client.query(
      `INSERT INTO ticket_attachments
        (request_id, uploaded_by_user_id, file_name, storage_key, mime_type, file_size_bytes, is_internal)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING attachment_id, request_id, uploaded_by_user_id, file_name, mime_type,
                 file_size_bytes, created_at, is_internal`,
      [
        requestId,
        actorUser.user_id,
        attachment.fileName,
        attachment.storageKey,
        attachment.mime_type,
        attachment.buffer.length,
        !!attachment.is_internal,
      ],
    );

    await insertTicketHistory(
      client,
      requestId,
      actorUser.user_id,
      "comment_added",
      {
        details: attachment.is_internal
          ? "Internal attachment added"
          : `Attachment added: ${attachment.fileName}`,
      },
    );

    if (!attachment.is_internal) {
      await insertNotifications(
        client,
        ticketParticipantIds(request, actorUser.user_id),
        "ticket_attachment",
        `New attachment on ${request.ticket_number || `ticket ${requestId}`}`,
        `${actorUser.full_name || "A user"} uploaded ${attachment.fileName}.`,
        requestId,
        {
          actor_user: actorUser,
          payload: { change_type: "attachment_added", file_name: attachment.fileName },
        },
      );
    }

    await logAction(
      actorUser.user_id,
      "Ticket attachment added",
      "service_request",
      requestId,
      attachment.fileName,
      client,
    );

    return inserted.rows[0];
  }).catch(async (err) => {
    if (attachment?.storageKey) {
      await removeAttachmentFile(attachment.storageKey);
    }
    throw err;
  });
}

async function loadAttachmentRecord(client, requestId, attachmentId) {
  const result = await client.query(
    `SELECT attachment_id, request_id, uploaded_by_user_id, file_name, storage_key, mime_type,
            file_size_bytes, is_internal, deleted_at
     FROM ticket_attachments
     WHERE request_id = $1 AND attachment_id = $2`,
    [requestId, attachmentId],
  );
  return result.rows[0] || null;
}

async function updateServiceRequestAssetRecord(
  requestId,
  affectedAssetId,
  actorUser,
) {
  return withTransaction(async (client) => {
    const existing = await client.query(
      `SELECT request_id, ticket_number, requester_id, affected_asset_id,
              assigned_technician_id, assigned_ict_officer_id
       FROM service_requests
       WHERE request_id = $1
       FOR UPDATE`,
      [requestId],
    );
    if (existing.rows.length === 0) return null;

    const previous = existing.rows[0];
    const nextAssetId = affectedAssetId ? Number(affectedAssetId) : null;

    let nextFloorId = null;
    if (nextAssetId) {
      const assetResult = await client.query(
        `SELECT floor_id FROM assets WHERE asset_id = $1`,
        [nextAssetId],
      );
      nextFloorId = assetResult.rows[0]?.floor_id || null;
    }

    const updated = await client.query(
      `UPDATE service_requests
       SET affected_asset_id = $1,
           floor_id = $2,
           status_changed_at = NOW()
       WHERE request_id = $3
       RETURNING *`,
      [nextAssetId, nextFloorId, requestId],
    );

    await insertTicketHistory(
      client,
      requestId,
      actorUser.user_id,
      "status_changed",
      {
        details: nextAssetId
          ? `Affected asset linked to asset_id ${nextAssetId}`
          : "Affected asset link removed",
      },
    );

    await insertNotifications(
      client,
      ticketParticipantIds(previous, actorUser.user_id),
      "ticket_updated",
      `Ticket ${previous.ticket_number || requestId} updated`,
      nextAssetId
        ? `${actorDisplayName(actorUser)} linked an affected asset to this ticket.`
        : `${actorDisplayName(actorUser)} removed the affected asset from this ticket.`,
      requestId,
      {
        actor_user: actorUser,
        payload: {
          change_type: nextAssetId ? "asset_linked" : "asset_removed",
          affected_asset_id: nextAssetId,
        },
      },
    );

    await logAction(
      actorUser.user_id,
      nextAssetId ? "Affected asset linked" : "Affected asset removed",
      "service_request",
      requestId,
      nextAssetId
        ? `Linked asset_id ${nextAssetId}`
        : "Removed affected asset link",
      client,
    );

    return updated.rows[0];
  });
}

module.exports = {
  TICKET_PRIORITIES,
  TICKET_SOURCE_CHANNELS,
  TICKET_STATUSES,
  TICKET_TYPES,
  addTicketAttachmentRecord,
  addTicketCommentRecord,
  assignServiceRequestRecord,
  buildTicketNumber,
  buildSlaSummary,
  canActorTransitionStatus,
  createServiceRequestRecord,
  decideServiceRequestApprovalRecord,
  fetchActiveSlaPolicies,
  getAllowedTicketTransitions,
  getServiceRequestById,
  getServiceRequestDetails,
  loadAssignmentHistory,
  loadAttachmentRecord,
  loadTicketArtifacts,
  updateServiceRequestAssetRecord,
  updateServiceRequestStatusRecord,
  validateTicketTransition,
};
