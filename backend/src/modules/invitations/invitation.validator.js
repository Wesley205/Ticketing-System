const { body, param, query, validationResult } = require('express-validator');

const AppError = require('../../errors/AppError');
const { ERROR_CODES } = require('../../errors/errorCodes');
const { validatePasswordStrength } = require('../../utils/authSecurity');
const {
  INVITATION_ERROR_MESSAGES,
  INVITATION_STATUSES,
  USER_ROLES,
  USER_TYPES,
} = require('./invitation.constants');

function validationError(errors) {
  return new AppError({
    code: ERROR_CODES.VALIDATION_ERROR,
    statusCode: 400,
    message: INVITATION_ERROR_MESSAGES.invalidData,
    details: errors.array().map((error) => ({
      field: error.path || error.param || null,
      message: error.msg,
    })),
  });
}

function sendValidationError(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors));
  }
  return next();
}

const list = [
  query('status').optional().isIn(INVITATION_STATUSES).withMessage('Invalid invitation status.'),
  sendValidationError,
];

const create = [
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('email').trim().isEmail().withMessage('A valid email is required'),
  body('role').isIn(USER_ROLES).withMessage('Invalid role'),
  body('user_type').isIn(USER_TYPES).withMessage('Invalid user type'),
  body('department_id').optional({ nullable: true }).isInt().withMessage('Invalid department'),
  sendValidationError,
];

const accept = [
  body('token').trim().notEmpty().withMessage('Invitation token is required'),
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').custom((value) => {
    const error = validatePasswordStrength(value);
    if (error) throw new Error(error);
    return true;
  }),
  body('phone').optional({ nullable: true }).trim(),
  sendValidationError,
];

const revoke = [
  param('id').isInt({ min: 1 }).withMessage('Invitation id must be a positive integer.'),
  sendValidationError,
];

module.exports = {
  accept,
  create,
  list,
  revoke,
  validationError,
};
