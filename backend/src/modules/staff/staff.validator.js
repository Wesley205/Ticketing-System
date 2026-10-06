const { body, param, query, validationResult } = require('express-validator');
const { validatePasswordStrength } = require('../../utils/authSecurity');
const { USER_ROLES, USER_TYPES } = require('./staff.constants');
const { TECHNICIAN_AVAILABILITY_STATES } = require('../../shared/constants/domain');

function sendFirstValidationError(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  return next();
}

const staffIdParam = [
  param('id').isInt({ min: 1 }).withMessage('Staff id must be a positive integer.'),
  sendFirstValidationError,
];

const listStaff = [
  query('search').optional().trim().isLength({ max: 120 }).withMessage('Search is too long.'),
  query('role').optional().isIn(USER_ROLES).withMessage('Invalid role'),
  query('user_type').optional().isIn(USER_TYPES).withMessage('Invalid user type'),
  query('department_id').optional().isInt({ min: 1 }).withMessage('Department id must be a positive integer.'),
  sendFirstValidationError,
];

const createStaff = [
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').custom((value) => {
    const error = validatePasswordStrength(value);
    if (error) throw new Error(error);
    return true;
  }),
  body('role').isIn(USER_ROLES).withMessage('Invalid role'),
  body('user_type').optional().isIn(USER_TYPES).withMessage('Invalid user type'),
  body('department_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Department id must be a positive integer.'),
  body('floor_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Floor id must be a positive integer.'),
  body('technician_availability').optional().isIn(TECHNICIAN_AVAILABILITY_STATES).withMessage('Invalid technician availability.'),
  body('technician_capacity').optional().isInt({ min: 1, max: 50 }).withMessage('Technician capacity must be between 1 and 50.'),
  body('supervisor_user_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Supervisor id must be a positive integer.'),
  sendFirstValidationError,
];

const updateStaff = [
  ...staffIdParam.slice(0, -1),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('role').optional().isIn(USER_ROLES).withMessage('Invalid role'),
  body('user_type').optional().isIn(USER_TYPES).withMessage('Invalid user type'),
  body('department_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Department id must be a positive integer.'),
  body('floor_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Floor id must be a positive integer.'),
  body('technician_availability').optional().isIn(TECHNICIAN_AVAILABILITY_STATES).withMessage('Invalid technician availability.'),
  body('technician_capacity').optional().isInt({ min: 1, max: 50 }).withMessage('Technician capacity must be between 1 and 50.'),
  body('supervisor_user_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Supervisor id must be a positive integer.'),
  sendFirstValidationError,
];

const updateStatus = [
  ...staffIdParam.slice(0, -1),
  body('is_active').isBoolean().withMessage('is_active must be a boolean.'),
  sendFirstValidationError,
];

const extendTemporary = [
  ...staffIdParam.slice(0, -1),
  body('account_expiration_date').notEmpty().withMessage('A new account expiration date is required.'),
  sendFirstValidationError,
];

module.exports = {
  createStaff,
  extendTemporary,
  listStaff,
  staffIdParam,
  updateStaff,
  updateStatus,
};
