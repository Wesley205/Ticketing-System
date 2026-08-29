const {
  canAddInternalTicketNote,
  canCommentOnServiceRequest,
  canCreateServiceRequest,
  canManageServiceRequestAssignments,
  canManageTicketAttachments,
  canUpdateServiceRequest,
  canViewAsset,
  canViewServiceRequest,
  canViewInternalTicketArtifacts,
  isTechnician,
} = require("../../utils/authorization");

function canUseAssignedQueue(user) {
  return isTechnician(user);
}

function buildTicketPermissions(user, request, allowedStatusTransitions = []) {
  return {
    can_add_comment: canCommentOnServiceRequest(user, request),
    can_add_internal_note: canAddInternalTicketNote(user),
    can_manage_attachments: canManageTicketAttachments(user, request),
    can_view_internal_artifacts: canViewInternalTicketArtifacts(user, request),
    can_assign: canManageServiceRequestAssignments(user),
    can_update_status: canUpdateServiceRequest(user, request),
    allowed_status_transitions: allowedStatusTransitions,
  };
}

module.exports = {
  buildTicketPermissions,
  canAddInternalTicketNote,
  canCommentOnServiceRequest,
  canCreateServiceRequest,
  canManageServiceRequestAssignments,
  canManageTicketAttachments,
  canUpdateServiceRequest,
  canUseAssignedQueue,
  canViewAsset,
  canViewServiceRequest,
  canViewInternalTicketArtifacts,
};
