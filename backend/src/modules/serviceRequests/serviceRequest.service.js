const fs = require("fs");
const pool = require("../../config/db");
const legacyService = require("./serviceRequest.workflow");
const { resolveAttachmentPath, saveAttachmentFile } = require("../../utils/ticketAttachments");
const policy = require("./serviceRequest.policy");
const mapper = require("./serviceRequest.mapper");
const repository = require("./serviceRequest.repository");

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

  await validateAffectedAsset(
    user,
    payload.affected_asset_id,
    "You do not have permission to link that asset to this ticket.",
  );

  return legacyService.createServiceRequestRecord({
    requester_id: user.user_id,
    requester_role: user.role,
    department_id: departmentId || null,
    ticket_type: payload.ticket_type || "Incident",
    category: payload.category,
    subcategory: payload.subcategory,
    subject: payload.subject,
    description: payload.description,
    priority: payload.priority || "Medium",
    impact: payload.impact || payload.priority || "Medium",
    urgency: payload.urgency || payload.priority || "Medium",
    affected_asset_id: payload.affected_asset_id || null,
    closure_confirmation_required: !!payload.closure_confirmation_required,
    source_channel: payload.source_channel || "portal",
  });
}

async function assignTicket(user, requestId, payload) {
  if (!policy.canManageServiceRequestAssignments(user)) {
    throw forbidden("You do not have permission to assign service requests.");
  }

  await loadRequestOrThrow(requestId);

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

  return legacyService.updateServiceRequestStatusRecord(
    requestId,
    payload.status,
    { note: payload.note, resolution: payload.resolution },
    user,
  );
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
  getAssignmentHistory,
  getAttachmentDownload,
  getMetadata,
  getTicketDetail,
  listAssignedToMe,
  listTickets,
  updateAffectedAsset,
  updateStatus,
};
