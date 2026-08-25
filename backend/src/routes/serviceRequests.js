const express = require('express');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const {
  canAddInternalTicketNote,
  canCommentOnServiceRequest,
  canCreateServiceRequest,
  canManageServiceRequestAssignments,
  canManageTicketAttachments,
  canViewServiceRequest,
  canViewInternalTicketArtifacts,
  constrainServiceRequestVisibility,
  isTechnician,
} = require('../utils/authorization');
const {
  TICKET_PRIORITIES,
  TICKET_SOURCE_CHANNELS,
  TICKET_STATUSES,
  TICKET_TYPES,
  addTicketAttachmentRecord,
  addTicketCommentRecord,
  assignServiceRequestRecord,
  createServiceRequestRecord,
  fetchActiveSlaPolicies,
  getAllowedTicketTransitions,
  getServiceRequestById,
  getServiceRequestDetails,
  loadAssignmentHistory,
  loadAttachmentRecord,
  updateServiceRequestStatusRecord,
} = require('../services/serviceRequests');
const { resolveAttachmentPath, saveAttachmentFile } = require('../utils/ticketAttachments');

const router = express.Router();

const SR_SELECT = `
  SELECT sr.*, req.full_name AS requester_name, d.name AS department_name,
         tech.full_name AS technician_name, officer.full_name AS ict_officer_name
  FROM service_requests sr
  LEFT JOIN users req ON req.user_id = sr.requester_id
  LEFT JOIN departments d ON d.department_id = sr.department_id
  LEFT JOIN users tech ON tech.user_id = sr.assigned_technician_id
  LEFT JOIN users officer ON officer.user_id = sr.assigned_ict_officer_id
`;

async function loadRequestOr404(req, res) {
  const request = await getServiceRequestById(pool, req.params.id);
  if (!request) {
    res.status(404).json({ error: 'Request not found.' });
    return null;
  }
  return request;
}

router.get('/', requireAuth, async (req, res) => {
  const { status, priority, category, ticket_type, mine } = req.query;
  const clauses = [];
  const params = [];

  constrainServiceRequestVisibility(req.user, {
    clauses,
    params,
    alias: 'sr',
    mine: mine === 'true',
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

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  try {
    const result = await pool.query(`${SR_SELECT} ${where} ORDER BY sr.date_submitted DESC`, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load service requests.' });
  }
});

router.get('/assigned-to-me', requireAuth, async (req, res) => {
  if (!isTechnician(req.user)) {
    return res.status(403).json({ error: 'Only technicians can view an assigned queue.' });
  }

  try {
    const result = await pool.query(
      `${SR_SELECT} WHERE sr.assigned_technician_id = $1 ORDER BY sr.date_submitted DESC`,
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load assigned requests.' });
  }
});

router.get('/metadata/options', requireAuth, async (req, res) => {
  try {
    const policies = await fetchActiveSlaPolicies(pool);
    res.json({
      priorities: TICKET_PRIORITIES,
      source_channels: TICKET_SOURCE_CHANNELS,
      statuses: TICKET_STATUSES,
      ticket_types: TICKET_TYPES,
      sla_policies: policies,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load ticket metadata.' });
  }
});

router.get('/:id/assignment-history', requireAuth, async (req, res) => {
  try {
    const request = await loadRequestOr404(req, res);
    if (!request) return;
    if (!canViewServiceRequest(req.user, request)) {
      return res.status(403).json({ error: 'You do not have permission to view this request.' });
    }

    const history = await loadAssignmentHistory(pool, req.params.id);
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load assignment history.' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const request = await loadRequestOr404(req, res);
    if (!request) return;
    if (!canViewServiceRequest(req.user, request)) {
      return res.status(403).json({ error: 'You do not have permission to view this request.' });
    }

    const detail = await getServiceRequestDetails(pool, req.params.id, req.user);
    detail.permissions = {
      can_add_comment: canCommentOnServiceRequest(req.user, request),
      can_add_internal_note: canAddInternalTicketNote(req.user),
      can_manage_attachments: canManageTicketAttachments(req.user, request),
      can_view_internal_artifacts: canViewInternalTicketArtifacts(req.user, request),
      can_assign: canManageServiceRequestAssignments(req.user),
      allowed_status_transitions: getAllowedTicketTransitions(req.user, request),
    };

    res.json(detail);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load request.' });
  }
});

router.post(
  '/',
  requireAuth,
  [
    body('ticket_type').optional().isIn(TICKET_TYPES).withMessage('Invalid ticket type'),
    body('category').notEmpty().withMessage('Category is required'),
    body('priority').optional().isIn(TICKET_PRIORITIES).withMessage('Invalid priority'),
    body('impact').optional({ nullable: true }).isIn(TICKET_PRIORITIES).withMessage('Invalid impact'),
    body('urgency').optional({ nullable: true }).isIn(TICKET_PRIORITIES).withMessage('Invalid urgency'),
    body('source_channel').optional().isIn(TICKET_SOURCE_CHANNELS).withMessage('Invalid source channel'),
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const {
      ticket_type,
      category,
      subcategory,
      subject,
      description,
      priority,
      impact,
      urgency,
      department_id,
      affected_asset_id,
      closure_confirmation_required,
      source_channel,
    } = req.body;

    if (!canCreateServiceRequest(req.user, department_id || req.user.department_id)) {
      return res.status(403).json({ error: 'You may only create requests for your own department.' });
    }

    try {
      const result = await createServiceRequestRecord({
        requester_id: req.user.user_id,
        requester_role: req.user.role,
        department_id: department_id || req.user.department_id || null,
        ticket_type: ticket_type || 'Incident',
        category,
        subcategory,
        subject,
        description,
        priority: priority || 'Medium',
        impact: impact || priority || 'Medium',
        urgency: urgency || priority || 'Medium',
        affected_asset_id: affected_asset_id || null,
        closure_confirmation_required: !!closure_confirmation_required,
        source_channel: source_channel || 'portal',
      });
      res.status(201).json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Failed to submit request.' });
    }
  }
);

router.patch('/:id/assign', requireAuth, async (req, res) => {
  if (!canManageServiceRequestAssignments(req.user)) {
    return res.status(403).json({ error: 'You do not have permission to assign service requests.' });
  }

  const { assigned_technician_id, assignment_note, expected_completion_at } = req.body;
  try {
    const existing = await loadRequestOr404(req, res);
    if (!existing) return;

    if (assigned_technician_id) {
      const techResult = await pool.query(
        `SELECT user_id, role, is_active FROM users WHERE user_id = $1`,
        [assigned_technician_id]
      );
      if (techResult.rows.length === 0 || techResult.rows[0].role !== 'technician' || !techResult.rows[0].is_active) {
        return res.status(400).json({ error: 'Assigned technician must be an active technician account.' });
      }
    }

    const result = await assignServiceRequestRecord(
      req.params.id,
      assigned_technician_id,
      req.user,
      {
        assignment_note,
        assigned_ict_officer_id: req.user.user_id,
        expected_completion_at: expected_completion_at || null,
      }
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to assign technician.' });
  }
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status, resolution, note } = req.body;
  if (!TICKET_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  try {
    const existing = await loadRequestOr404(req, res);
    if (!existing) return;
    if (!canViewServiceRequest(req.user, existing)) {
      return res.status(403).json({ error: 'You do not have permission to update this request.' });
    }

    const result = await updateServiceRequestStatusRecord(
      req.params.id,
      status,
      { note, resolution },
      req.user
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to update request status.' });
  }
});

router.post(
  '/:id/comments',
  requireAuth,
  [
    body('comment_body').trim().notEmpty().withMessage('Comment text is required'),
    body('is_internal').optional().isBoolean().withMessage('Invalid internal-note flag'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    try {
      const request = await loadRequestOr404(req, res);
      if (!request) return;
      if (!canCommentOnServiceRequest(req.user, request)) {
        return res.status(403).json({ error: 'You do not have permission to comment on this request.' });
      }
      if (req.body.is_internal && !canAddInternalTicketNote(req.user)) {
        return res.status(403).json({ error: 'Only ICT operational users may add internal notes.' });
      }

      const result = await addTicketCommentRecord(
        req.params.id,
        req.user,
        req.body.comment_body,
        !!req.body.is_internal
      );
      res.status(201).json(result);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message || 'Failed to add comment.' });
    }
  }
);

router.post(
  '/:id/attachments',
  requireAuth,
  [
    body('file_name').trim().notEmpty().withMessage('File name is required'),
    body('mime_type').trim().notEmpty().withMessage('Mime type is required'),
    body('content_base64').trim().notEmpty().withMessage('File content is required'),
    body('is_internal').optional().isBoolean().withMessage('Invalid internal attachment flag'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    try {
      const request = await loadRequestOr404(req, res);
      if (!request) return;
      if (!canManageTicketAttachments(req.user, request)) {
        return res.status(403).json({ error: 'You do not have permission to attach files to this request.' });
      }
      if (req.body.is_internal && !canAddInternalTicketNote(req.user)) {
        return res.status(403).json({ error: 'Only ICT operational users may add internal attachments.' });
      }

      const saved = await saveAttachmentFile(req.params.id, req.body);
      const result = await addTicketAttachmentRecord(req.params.id, req.user, {
        ...saved,
        mime_type: req.body.mime_type,
        is_internal: !!req.body.is_internal,
      });

      res.status(201).json(result);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message || 'Failed to attach file.' });
    }
  }
);

router.get('/:id/attachments/:attachmentId/download', requireAuth, async (req, res) => {
  try {
    const request = await loadRequestOr404(req, res);
    if (!request) return;
    if (!canViewServiceRequest(req.user, request)) {
      return res.status(403).json({ error: 'You do not have permission to view this request.' });
    }

    const attachment = await loadAttachmentRecord(pool, req.params.id, req.params.attachmentId);
    if (!attachment || attachment.deleted_at) {
      return res.status(404).json({ error: 'Attachment not found.' });
    }
    if (attachment.is_internal && !canViewInternalTicketArtifacts(req.user, request)) {
      return res.status(403).json({ error: 'You do not have permission to access this attachment.' });
    }

    const fullPath = resolveAttachmentPath(attachment.storage_key);
    await fs.promises.access(fullPath);
    res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
    res.sendFile(fullPath);
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: 'Attachment file not found.' });
  }
});

module.exports = router;
