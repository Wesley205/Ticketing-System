const fs = require("fs");
const pool = require("../../config/db");
const legacyService = require("./serviceRequest.workflow");
const {
  IMAGE_MIME_TYPES,
  MAX_TICKET_IMAGE_ATTACHMENTS,
  resolveAttachmentPath,
  saveAttachmentFile,
} = require("../../utils/ticketAttachments");
const policy = require("./serviceRequest.policy");
const mapper = require("./serviceRequest.mapper");
const repository = require("./serviceRequest.repository");
const serviceCatalog = require("../serviceCatalog/serviceCatalog.service");

function forbidden(message) {
  const err = new Error(message);
  err.statusCode = 403;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

async function loadRequestOrThrow(requestId) {
  const request = await legacyService.getServiceRequestById(pool, requestId);
  if (!request) {
    throw notFound("Request not found.");
  }
  return request;
}

async function validateAffectedAsset(user, assetId, actionMessage) {
  if (!assetId) return null;
  const asset = await repository.getAssetForTicket(pool, assetId);
  if (!asset) {
    throw notFound("Affected asset not found.");
  }
  if (asset.is_archived) {
    throw badRequest("Archived assets cannot be linked to tickets.");
  }
  if (!policy.canViewAsset(user, asset)) {
    throw forbidden(actionMessage);
  }
  return asset;
}

async function listTickets(user, query) {
  const rows = await repository.listServiceRequests(pool, user, query);
  return mapper.mapTicketList(rows);
}

async function listAssignedToMe(user) {
  if (!policy.canUseAssignedQueue(user)) {
    throw forbidden("Only technicians can view an assigned queue.");
  }
  const rows = await repository.listAssignedToUser(pool, user.user_id);
  return mapper.mapTicketList(rows);
}

async function getMetadata() {
  const policies = await legacyService.fetchActiveSlaPolicies(pool);
  return {
    priorities: legacyService.TICKET_PRIORITIES,
    source_channels: legacyService.TICKET_SOURCE_CHANNELS,
    statuses: legacyService.TICKET_STATUSES,
    ticket_types: legacyService.TICKET_TYPES,
    sla_policies: policies,
  };
}

async function getAssignmentHistory(user, requestId) {
  const request = await loadRequestOrThrow(requestId);
  if (!policy.canViewServiceRequest(user, request)) {
    throw forbidden("You do not have permission to view this request.");
  }
  return legacyService.loadAssignmentHistory(pool, requestId);
}

function describeRoutingCandidate(candidate) {
  const reasons = [];
  if (candidate.floor_match) reasons.push("Assigned to this floor");
  else if (candidate.floor_label) reasons.push(`Assigned to ${candidate.floor_label}`);
  else reasons.push("No floor assignment");

  reasons.push(`${candidate.active_count} of ${candidate.technician_capacity} active tickets`);
  reasons.push(String(candidate.technician_availability || "available").replaceAll("_", " "));
  return reasons.join("; ");
}

async function getRoutingSuggestions(user, requestId) {
  if (!policy.canManageServiceRequestAssignments(user)) {
    throw forbidden("You do not have permission to view assignment suggestions.");
  }
  await loadRequestOrThrow(requestId);
  const rows = await repository.listRoutingSuggestions(pool, requestId);
  return rows.map((row, index) => ({
    ...row,
    active_count: Number(row.active_count || 0),
    technician_capacity: Number(row.technician_capacity || 8),
    utilization_percent: Number(row.utilization_percent || 0),
    routing_reason: describeRoutingCandidate(row),
    recommended: index === 0 && row.technician_availability === "available",
  }));
}

async function getTicketDetail(user, requestId) {
  const request = await loadRequestOrThrow(requestId);
  if (!policy.canViewServiceRequest(user, request)) {
    throw forbidden("You do not have permission to view this request.");
  }

  const detail = await legacyService.getServiceRequestDetails(pool, requestId, user);
  return mapper.attachPermissions(
    detail,
    policy.buildTicketPermissions(
      user,
      request,
      legacyService.getAllowedTicketTransitions(user, request),
    ),
  );
}

async function createTicket(user, payload) {
  const departmentId = payload.department_id || user.department_id;
  if (!policy.canCreateServiceRequest(user, departmentId)) {
    throw forbidden("You may only create requests for your own department.");
  }

  const affectedAsset = await validateAffectedAsset(
    user,
    payload.affected_asset_id,
    "You do not have permission to link that asset to this ticket.",
  );

  const catalogItem = payload.catalog_item_id
    ? await serviceCatalog.getCatalogItem(payload.catalog_item_id)
    : null;
  if (payload.catalog_item_id && !catalogItem) {
    throw badRequest("The selected service catalog item is unavailable.");
  }

  const catalogResponses = payload.catalog_responses && typeof payload.catalog_responses === "object"
    ? payload.catalog_responses
    : {};
  for (const field of catalogItem?.form_schema || []) {
    if (field.required && !String(catalogResponses[field.key] || "").trim()) {
      throw badRequest(`${field.label || field.key} is required for this service.`);
    }
  }

  return legacyService.createServiceRequestRecord({
    requester_id: user.user_id,
    requester_role: user.role,
    department_id: departmentId || null,
    ticket_type: catalogItem?.ticket_type || payload.ticket_type || "Incident",
    category: catalogItem?.category || payload.category,
    subcategory: catalogItem?.name || payload.subcategory,
    subject: payload.subject,
    description: payload.description,
    priority: catalogItem?.default_priority || payload.priority || "Medium",
    impact: catalogItem?.default_priority || payload.impact || payload.priority || "Medium",
    urgency: catalogItem?.default_priority || payload.urgency || payload.priority || "Medium",
    affected_asset_id: payload.affected_asset_id || null,
    floor_id: payload.floor_id || affectedAsset?.floor_id || null,
    catalog_item_id: catalogItem?.catalog_item_id || null,
    catalog_responses: catalogResponses,
    approval_status: catalogItem?.approval_required ? "pending" : "not_required",
    approval_role: catalogItem?.approval_required ? catalogItem.approver_role : null,
    closure_confirmation_required: !!payload.closure_confirmation_required,
    source_channel: payload.source_channel || "portal",
  });
}

async function assignTicket(user, requestId, payload) {
  if (!policy.canManageServiceRequestAssignments(user)) {
    throw forbidden("You do not have permission to assign service requests.");
  }

  const request = await loadRequestOrThrow(requestId);
  if (request.approval_status === "pending") {
    throw badRequest("This request must be approved before it can be assigned.");
  }
  if (request.approval_status === "rejected") {
    throw badRequest("Rejected requests cannot be assigned.");
  }

  if (payload.assigned_technician_id) {
    const technician = await repository.getActiveTechnicianById(pool, payload.assigned_technician_id);
    if (!technician) {
      throw badRequest("Assigned technician must be an active technician account.");
    }
  }

  return legacyService.assignServiceRequestRecord(
    requestId,
    payload.assigned_technician_id,
    user,
    {
      assignment_note: payload.assignment_note,
      assigned_ict_officer_id: user.user_id,
      expected_completion_at: payload.expected_completion_at || null,
    },
  );
}

async function updateAffectedAsset(user, requestId, payload) {
  const request = await loadRequestOrThrow(requestId);
  if (!policy.canViewServiceRequest(user, request)) {
    throw forbidden("You do not have permission to update this request.");
  }

  const nextAssetId = payload.affected_asset_id || null;
  await validateAffectedAsset(
    user,
    nextAssetId,
    "You do not have permission to link that asset to this request.",
  );

  return legacyService.updateServiceRequestAssetRecord(requestId, nextAssetId, user);
}

async function updateStatus(user, requestId, payload) {
  const request = await loadRequestOrThrow(requestId);
  if (!policy.canViewServiceRequest(user, request)) {
    throw forbidden("You do not have permission to update this request.");
  }

  if (payload.status === "Assigned") {
    throw badRequest("Use the assignment action to select a technician before assigning a ticket.");
  }
  if (request.approval_status === "pending" && payload.status !== "Cancelled") {
    throw badRequest("This request is awaiting approval and cannot enter active work.");
  }

  return legacyService.updateServiceRequestStatusRecord(
    requestId,
    payload.status,
    { note: payload.note, resolution: payload.resolution },
    user,
  );
}

async function decideApproval(user, requestId, payload) {
  if (payload.decision === "rejected" && !payload.note?.trim()) {
    throw badRequest("A rejection reason is required.");
  }

  return legacyService.decideServiceRequestApprovalRecord(requestId, user, payload);
}

async function addComment(user, requestId, payload) {
  const request = await loadRequestOrThrow(requestId);
  if (!policy.canCommentOnServiceRequest(user, request)) {
    throw forbidden("You do not have permission to comment on this request.");
  }
  if (payload.is_internal && !policy.canAddInternalTicketNote(user)) {
    throw forbidden("Only ICT operational users may add internal notes.");
  }

  return legacyService.addTicketCommentRecord(
    requestId,
    user,
    payload.comment_body,
    !!payload.is_internal,
  );
}

async function addAttachment(user, requestId, payload) {
  const request = await loadRequestOrThrow(requestId);
  if (!policy.canManageTicketAttachments(user, request)) {
    throw forbidden("You do not have permission to attach files to this request.");
  }
  if (payload.is_internal && !policy.canAddInternalTicketNote(user)) {
    throw forbidden("Only ICT operational users may add internal attachments.");
  }

  if (IMAGE_MIME_TYPES.has(payload.mime_type)) {
    const countResult = await pool.query(
      `SELECT COUNT(*)::integer AS image_count
       FROM ticket_attachments
       WHERE request_id = $1
         AND deleted_at IS NULL
         AND mime_type = ANY($2::text[])`,
      [requestId, Array.from(IMAGE_MIME_TYPES)],
    );
    if (Number(countResult.rows[0]?.image_count || 0) >= MAX_TICKET_IMAGE_ATTACHMENTS) {
      throw badRequest(`Tickets can include up to ${MAX_TICKET_IMAGE_ATTACHMENTS} images.`);
    }
  }

  const saved = await saveAttachmentFile(requestId, payload);
  return legacyService.addTicketAttachmentRecord(requestId, user, {
    ...saved,
    mime_type: payload.mime_type,
    is_internal: !!payload.is_internal,
  });
}

async function getAttachmentDownload(user, requestId, attachmentId) {
  const request = await loadRequestOrThrow(requestId);
  if (!policy.canViewServiceRequest(user, request)) {
    throw forbidden("You do not have permission to view this request.");
  }

  const attachment = await legacyService.loadAttachmentRecord(pool, requestId, attachmentId);
  if (!attachment || attachment.deleted_at) {
    throw notFound("Attachment not found.");
  }
  if (attachment.is_internal && !policy.canViewInternalTicketArtifacts(user, request)) {
    throw forbidden("You do not have permission to access this attachment.");
  }

  const fullPath = resolveAttachmentPath(attachment.storage_key);
  await fs.promises.access(fullPath);
  return {
    attachment,
    fullPath,
  };
}

module.exports = {
  ...legacyService,
  addAttachment,
  addComment,
  assignTicket,
  createTicket,
  decideApproval,
  getAssignmentHistory,
  getAttachmentDownload,
  getMetadata,
  getRoutingSuggestions,
  getTicketDetail,
  listAssignedToMe,
  listTickets,
  updateAffectedAsset,
  updateStatus,
};
