const crypto = require('crypto');
const { isOrganizationEmail, isTemporaryUser, normalizeUserType } = require('../config/authPolicy');

function createInvitationToken() {
  return crypto.randomBytes(Number(process.env.INVITATION_TOKEN_BYTES || 24)).toString('hex');
}

function hashInvitationToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function buildInvitationUrl(token) {
  const baseUrl = (process.env.INTERNAL_APP_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');
  return `${baseUrl}/register.html?token=${encodeURIComponent(token)}`;
}

function validateInvitationRequest(payload) {
  const userType = normalizeUserType(payload.user_type);

  if (userType === 'employee' && !isOrganizationEmail(payload.email)) {
    return 'Employee invitations must use an approved organization email address.';
  }

  if (isTemporaryUser(userType)) {
    if (!payload.sponsor_name || !String(payload.sponsor_name).trim()) {
      return 'Temporary-user invitations require a sponsor or supervisor.';
    }
    if (!payload.account_expiration_date) {
      return 'Temporary-user invitations require an account expiration date.';
    }
  }

  return null;
}

module.exports = {
  buildInvitationUrl,
  createInvitationToken,
  hashInvitationToken,
  validateInvitationRequest,
};
