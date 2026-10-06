const { body, param, query, validationResult } = require("express-validator");
const {
  TICKET_PRIORITIES,
  TICKET_SOURCE_CHANNELS,
  TICKET_STATUSES,
  TICKET_TYPES,
} = require("./serviceRequest.constants");

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  return next();
}

const ticketIdParam = [
  param("id").isInt({ min: 1 }).withMessage("Invalid service request ID."),
];

const attachmentIdParam = [
  ...ticketIdParam,
  param("attachmentId").isInt({ min: 1 }).withMessage("Invalid attachment ID."),
];

const listTicketValidators = [
  query("queue").optional().isIn(["unassigned", "sla_risk", "overdue", "pending_approval"]).withMessage("Invalid operational queue."),
];

const createTicketValidators = [
  body("ticket_type").optional().isIn(TICKET_TYPES).withMessage("Invalid ticket type"),
  body("category").notEmpty().withMessage("Category is required"),
  body("priority").optional().isIn(TICKET_PRIORITIES).withMessage("Invalid priority"),
  body("impact").optional({ nullable: true }).isIn(TICKET_PRIORITIES).withMessage("Invalid impact"),
  body("urgency").optional({ nullable: true }).isIn(TICKET_PRIORITIES).withMessage("Invalid urgency"),
  body("source_channel").optional().isIn(TICKET_SOURCE_CHANNELS).withMessage("Invalid source channel"),
  body("floor_id").optional({ nullable: true }).isInt({ min: 1 }).withMessage("Invalid floor"),
  body("catalog_item_id").optional({ nullable: true }).isInt({ min: 1 }).withMessage("Invalid catalog item"),
  body("catalog_responses").optional().isObject().withMessage("Catalog responses must be an object"),
  body("subject").trim().notEmpty().withMessage("Subject is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
];

const statusValidators = [
  ...ticketIdParam,
  body("status").isIn(TICKET_STATUSES).withMessage("Invalid status value."),
];

const commentValidators = [
  ...ticketIdParam,
  body("comment_body").trim().notEmpty().withMessage("Comment text is required"),
  body("is_internal").optional().isBoolean().withMessage("Invalid internal-note flag"),
];

const attachmentValidators = [
  ...ticketIdParam,
  body("file_name").trim().notEmpty().withMessage("File name is required"),
  body("mime_type").trim().notEmpty().withMessage("Mime type is required"),
  body("content_base64").trim().notEmpty().withMessage("File content is required"),
  body("is_internal").optional().isBoolean().withMessage("Invalid internal attachment flag"),
];

const approvalValidators = [
  ...ticketIdParam,
  body("decision").isIn(["approved", "rejected"]).withMessage("Approval decision must be approved or rejected."),
  body("note").optional({ nullable: true }).trim().isLength({ max: 1000 }).withMessage("Approval note is too long."),
];

module.exports = {
  attachmentIdParam,
  attachmentValidators,
  approvalValidators,
  commentValidators,
  createTicketValidators,
  handleValidation,
  listTicketValidators,
  statusValidators,
  ticketIdParam,
};
