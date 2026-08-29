const express = require("express");
const { requireAuth } = require("../../middleware/auth");
const controller = require("./serviceRequest.controller");
const validator = require("./serviceRequest.validator");

const router = express.Router();

router.get("/", requireAuth, controller.listTickets);
router.get("/assigned-to-me", requireAuth, controller.listAssignedToMe);
router.get("/metadata/options", requireAuth, controller.getMetadata);

router.get(
  "/:id/assignment-history",
  requireAuth,
  validator.ticketIdParam,
  validator.handleValidation,
  controller.getAssignmentHistory,
);

router.get(
  "/:id",
  requireAuth,
  validator.ticketIdParam,
  validator.handleValidation,
  controller.getTicketDetail,
);

router.post(
  "/",
  requireAuth,
  validator.createTicketValidators,
  validator.handleValidation,
  controller.createTicket,
);

router.patch(
  "/:id/assign",
  requireAuth,
  validator.ticketIdParam,
  validator.handleValidation,
  controller.assignTicket,
);

router.patch(
  "/:id/affected-asset",
  requireAuth,
  validator.ticketIdParam,
  validator.handleValidation,
  controller.updateAffectedAsset,
);

router.patch(
  "/:id/status",
  requireAuth,
  validator.statusValidators,
  validator.handleValidation,
  controller.updateStatus,
);

router.post(
  "/:id/comments",
  requireAuth,
  validator.commentValidators,
  validator.handleValidation,
  controller.addComment,
);

router.post(
  "/:id/attachments",
  requireAuth,
  validator.attachmentValidators,
  validator.handleValidation,
  controller.addAttachment,
);

router.get(
  "/:id/attachments/:attachmentId/download",
  requireAuth,
  validator.attachmentIdParam,
  validator.handleValidation,
  controller.downloadAttachment,
);

module.exports = router;
