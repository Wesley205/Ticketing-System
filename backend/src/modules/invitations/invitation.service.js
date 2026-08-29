const bcrypt = require('bcrypt');
const crypto = require('crypto');

const pool = require('../../config/db');
const AppError = require('../../errors/AppError');
const { ERROR_CODES } = require('../../errors/errorCodes');
const { validateManagedUser, isOrganizationEmail, isTemporaryUser, normalizeUserType } = require('../../config/authPolicy');
const { validatePasswordStrength } = require('../../utils/authSecurity');
const { withTransaction } = require('../../utils/transactions');
const { logAction } = require('../../utils/audit');
const { issueToken } = require('../auth/auth.service');
const mapper = require('./invitation.mapper');
const repository = require('./invitation.repository');
const {
  DEFAULT_INVITATION_EXPIRES_DAYS,
  DEFAULT_INVITATION_TOKEN_BYTES,
  INVITATION_ERROR_MESSAGES,
  INVITATION_SALT_ROUNDS,
} = require('./invitation.constants');

function createInvitationToken() {
  return crypto.randomBytes(Number(process.env.INVITATION_TOKEN_BYTES || DEFAULT_INVITATION_TOKEN_BYTES)).toString('hex');
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

function buildSession(user) {
  return mapper.mapSession(user, issueToken(user));
}

function validationAppError(message, details = []) {
  return new AppError({
    code: ERROR_CODES.VALIDATION_ERROR,
    statusCode: 400,
    message,
    details,
  });
}

function duplicateAppError(message) {
  return new AppError({
    code: ERROR_CODES.DUPLICATE_RESOURCE,
    statusCode: 409,
    message,
  });
}

async function listInvitations(filters = {}, executor = pool) {
  const rows = await repository.listInvitations(executor, filters);
  return mapper.mapInvitationRows(rows);
}

async function createInvitationRecord(invitationData) {
  return withTransaction(async (client) => {
    const result = await repository.insertInvitation(client, invitationData);

    await logAction(
      invitationData.invited_by_user_id,
      'Invitation created',
      'invitation',
      result.invitation_id,
      `Created invitation for ${invitationData.email}`,
      client
    );

    return mapper.mapInvitationRow(result);
  });
}

async function createInvitation(data, actorUser, executor = pool) {
  const invitationError = validateInvitationRequest(data) || validateManagedUser(data);
  if (invitationError) {
    throw validationAppError(invitationError);
  }

  const normalizedEmail = data.email.trim().toLowerCase();
  const existing = await repository.findUserByEmail(executor, normalizedEmail);
  if (existing) {
    throw duplicateAppError(INVITATION_ERROR_MESSAGES.duplicateInvitee);
  }

  const rawToken = createInvitationToken();
  const tokenHash = hashInvitationToken(rawToken);
  const expiresInDays = Math.max(Number(data.expires_in_days) || DEFAULT_INVITATION_EXPIRES_DAYS, 1);

  const invitation = await createInvitationRecord({
    full_name: data.full_name,
    email: normalizedEmail,
    preferred_username: data.preferred_username,
    role: data.role,
    user_type: data.user_type,
    department_id: data.department_id,
    sponsor_name: data.sponsor_name,
    supervisor_user_id: data.supervisor_user_id,
    invited_by_user_id: actorUser.user_id,
    token_hash: tokenHash,
    account_start_date: data.account_start_date,
    account_expiration_date: data.account_expiration_date,
    expires_in_days: expiresInDays,
  });

  return {
    ...invitation,
    acceptance_url: buildInvitationUrl(rawToken),
  };
}

async function acceptInvitationRecord(invitation, username, password, phone) {
  return withTransaction(async (client) => {
    const lockedInvitation = await repository.lockInvitation(client, invitation.invitation_id);
    if (!lockedInvitation || lockedInvitation.status !== 'pending' || new Date(lockedInvitation.expires_at) < new Date()) {
      return null;
    }

    const passwordHash = await bcrypt.hash(password, INVITATION_SALT_ROUNDS);
    const user = await repository.insertAcceptedUser(client, invitation, username, passwordHash, phone);
    const accepted = await repository.markInvitationAccepted(client, invitation.invitation_id, user.user_id);
    if (!accepted) {
      throw new Error('Invitation is no longer active.');
    }

    await repository.ensureNotificationPreferences(client, user.user_id);
    await logAction(
      user.user_id,
      'Invitation accepted',
      'invitation',
      invitation.invitation_id,
      `${invitation.email} accepted an invitation`,
      client
    );

    return buildSession(user);
  });
}

async function acceptInvitation(data, executor = pool) {
  const passwordError = validatePasswordStrength(data.password);
  if (passwordError) {
    throw validationAppError(passwordError, [{ field: 'password', message: passwordError }]);
  }

  const tokenHash = hashInvitationToken(data.token);
  const invitation = await repository.findInvitationByTokenHash(executor, tokenHash);
  if (!invitation) {
    throw new AppError({
      code: ERROR_CODES.RESOURCE_NOT_FOUND,
      statusCode: 404,
      message: INVITATION_ERROR_MESSAGES.notFound,
    });
  }

  if (invitation.status !== 'pending') {
    throw new AppError({
      code: ERROR_CODES.AUTHORIZATION_FAILED,
      statusCode: 409,
      message: INVITATION_ERROR_MESSAGES.inactive,
    });
  }

  if (new Date(invitation.expires_at) < new Date()) {
    await repository.markInvitationExpired(executor, invitation.invitation_id);
    throw new AppError({
      code: ERROR_CODES.AUTHORIZATION_FAILED,
      statusCode: 410,
      message: INVITATION_ERROR_MESSAGES.expired,
    });
  }

  const duplicate = await repository.findDuplicateAcceptedUser(executor, invitation.email, data.username);
  if (duplicate) {
    throw duplicateAppError(INVITATION_ERROR_MESSAGES.duplicateAcceptedUser);
  }

  const session = await acceptInvitationRecord(invitation, data.username, data.password, data.phone);
  if (!session) {
    throw new AppError({
      code: ERROR_CODES.AUTHORIZATION_FAILED,
      statusCode: 409,
      message: INVITATION_ERROR_MESSAGES.inactive,
    });
  }

  return session;
}

async function revokeInvitationRecord(invitationId, adminUserId) {
  return withTransaction(async (client) => {
    const result = await repository.revokeInvitation(client, invitationId);

    if (!result) {
      return null;
    }

    await logAction(
      adminUserId,
      'Invitation revoked',
      'invitation',
      invitationId,
      `Revoked invitation for ${result.email}`,
      client
    );
    return mapper.mapInvitationRow(result);
  });
}

module.exports = {
  acceptInvitation,
  acceptInvitationRecord,
  buildInvitationUrl,
  buildSession,
  createInvitation,
  createInvitationRecord,
  createInvitationToken,
  hashInvitationToken,
  listInvitations,
  revokeInvitationRecord,
  validateInvitationRequest,
};
