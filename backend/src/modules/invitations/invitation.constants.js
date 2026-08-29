const {
  INVITATION_STATUSES,
  USER_ROLES,
  USER_TYPES,
} = require('../../shared/constants/domain');

const DEFAULT_INVITATION_EXPIRES_DAYS = 7;
const DEFAULT_INVITATION_TOKEN_BYTES = 24;
const INVITATION_SALT_ROUNDS = 12;

const INVITATION_ERROR_MESSAGES = {
  acceptFailed: 'Failed to accept invitation.',
  duplicateInvitee: 'A user with that email address already exists.',
  duplicateAcceptedUser: 'That email address or username is already in use.',
  expired: 'This invitation has expired.',
  inactive: 'This invitation is no longer active.',
  invalidData: 'The request contains invalid data.',
  listFailed: 'Failed to load invitations.',
  notFound: 'Invitation not found.',
  pendingNotFound: 'Pending invitation not found.',
  revokeFailed: 'Failed to revoke invitation.',
  revokeForbidden: 'Only administrators may revoke invitations.',
  createForbidden: 'Only administrators may create invitations.',
  viewForbidden: 'You do not have permission to view invitations.',
};

module.exports = {
  DEFAULT_INVITATION_EXPIRES_DAYS,
  DEFAULT_INVITATION_TOKEN_BYTES,
  INVITATION_ERROR_MESSAGES,
  INVITATION_SALT_ROUNDS,
  INVITATION_STATUSES,
  USER_ROLES,
  USER_TYPES,
};
