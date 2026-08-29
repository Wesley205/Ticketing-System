const AppError = require('../../errors/AppError');
const { ERROR_CODES } = require('../../errors/errorCodes');
const service = require('./invitation.service');
const { INVITATION_ERROR_MESSAGES } = require('./invitation.constants');

async function list(req, res) {
  try {
    const invitations = await service.listInvitations({ status: req.query.status });
    return res.json(invitations);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: INVITATION_ERROR_MESSAGES.listFailed });
  }
}

async function create(req, res, next) {
  try {
    const invitation = await service.createInvitation(req.body, req.user);
    return res.status(201).json(invitation);
  } catch (err) {
    return next(err);
  }
}

async function accept(req, res, next) {
  try {
    const session = await service.acceptInvitation(req.body);
    return res.status(201).json(session);
  } catch (err) {
    return next(err);
  }
}

async function revoke(req, res) {
  try {
    const result = await service.revokeInvitationRecord(req.params.id, req.user.user_id);

    if (!result) {
      return res.status(404).json({ error: INVITATION_ERROR_MESSAGES.pendingNotFound });
    }
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: INVITATION_ERROR_MESSAGES.revokeFailed });
  }
}

function toAppError(message, statusCode = 400) {
  return new AppError({
    code: ERROR_CODES.VALIDATION_ERROR,
    statusCode,
    message,
  });
}

module.exports = {
  accept,
  create,
  list,
  revoke,
  toAppError,
};
