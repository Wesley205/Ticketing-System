const service = require("./serviceRequest.service");

function sendError(res, err, fallbackMessage, fallbackStatus = 500) {
  const statusCode = err.statusCode || err.status || fallbackStatus;
  res.status(statusCode).json({ error: err.message || fallbackMessage });
}

async function listTickets(req, res) {
  try {
    const tickets = await service.listTickets(req.user, req.query);
    res.json(tickets);
  } catch (err) {
    console.error(err);
    sendError(res, err, "Failed to load service requests.");
  }
}

async function listAssignedToMe(req, res) {
  try {
    const tickets = await service.listAssignedToMe(req.user);
    res.json(tickets);
  } catch (err) {
    console.error(err);
    sendError(res, err, "Failed to load assigned requests.");
  }
}

async function getMetadata(_req, res) {
  try {
    const metadata = await service.getMetadata();
    res.json(metadata);
  } catch (err) {
    console.error(err);
    sendError(res, err, "Failed to load ticket metadata.");
  }
}

async function getAssignmentHistory(req, res) {
  try {
    const history = await service.getAssignmentHistory(req.user, req.params.id);
    res.json(history);
  } catch (err) {
    console.error(err);
    sendError(res, err, "Failed to load assignment history.");
  }
}

async function getRoutingSuggestions(req, res) {
  try {
    const suggestions = await service.getRoutingSuggestions(req.user, req.params.id);
    res.json(suggestions);
  } catch (err) {
    console.error(err);
    sendError(res, err, "Failed to load routing suggestions.");
  }
}

async function getTicketDetail(req, res) {
  try {
    const detail = await service.getTicketDetail(req.user, req.params.id);
    res.json(detail);
  } catch (err) {
    console.error(err);
    sendError(res, err, "Failed to load request.");
  }
}

async function createTicket(req, res) {
  try {
    const ticket = await service.createTicket(req.user, req.body);
    res.status(201).json(ticket);
  } catch (err) {
    console.error(err);
    sendError(res, err, "Failed to submit request.");
  }
}

async function decideApproval(req, res) {
  try {
    const ticket = await service.decideApproval(req.user, req.params.id, req.body);
    res.json(ticket);
  } catch (err) {
    console.error(err);
    sendError(res, err, "Failed to record the approval decision.");
  }
}

async function assignTicket(req, res) {
  try {
    const ticket = await service.assignTicket(req.user, req.params.id, req.body);
    res.json(ticket);
  } catch (err) {
    console.error(err);
    sendError(res, err, "Failed to assign technician.", 400);
  }
}

async function updateAffectedAsset(req, res) {
  try {
    const ticket = await service.updateAffectedAsset(req.user, req.params.id, req.body);
    res.json(ticket);
  } catch (err) {
    console.error(err);
    sendError(res, err, "Failed to update affected asset.", 400);
  }
}

async function updateStatus(req, res) {
  try {
    const ticket = await service.updateStatus(req.user, req.params.id, req.body);
    res.json(ticket);
  } catch (err) {
    console.error(err);
    sendError(res, err, "Failed to update request status.", 400);
  }
}

async function addComment(req, res) {
  try {
    const comment = await service.addComment(req.user, req.params.id, req.body);
    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    sendError(res, err, "Failed to add comment.", 400);
  }
}

async function addAttachment(req, res) {
  try {
    const attachment = await service.addAttachment(req.user, req.params.id, req.body);
    res.status(201).json(attachment);
  } catch (err) {
    console.error(err);
    sendError(res, err, "Failed to attach file.", 400);
  }
}

async function downloadAttachment(req, res) {
  try {
    const { attachment, fullPath } = await service.getAttachmentDownload(
      req.user,
      req.params.id,
      req.params.attachmentId,
    );
    res.setHeader("Content-Type", attachment.mime_type || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${attachment.file_name}"`);
    res.sendFile(fullPath);
  } catch (err) {
    console.error(err);
    sendError(res, err, "Attachment file not found.", 404);
  }
}

module.exports = {
  addAttachment,
  addComment,
  assignTicket,
  createTicket,
  decideApproval,
  downloadAttachment,
  getAssignmentHistory,
  getRoutingSuggestions,
  getMetadata,
  getTicketDetail,
  listAssignedToMe,
  listTickets,
  updateAffectedAsset,
  updateStatus,
};
