const { body, param, validationResult } = require('express-validator');

function sendFirstValidationError(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  return next();
}

const departmentIdParam = [
  param('id').isInt({ min: 1 }).withMessage('Department id must be a positive integer.'),
  sendFirstValidationError,
];

const createDepartment = [
  body('name').trim().notEmpty().withMessage('Department name is required'),
  body('description').optional({ nullable: true }).trim(),
  sendFirstValidationError,
];

const updateDepartment = [
  param('id').isInt({ min: 1 }).withMessage('Department id must be a positive integer.'),
  body('name').optional({ nullable: true }).trim().notEmpty().withMessage('Department name cannot be empty'),
  body('description').optional({ nullable: true }).trim(),
  sendFirstValidationError,
];

module.exports = {
  createDepartment,
  departmentIdParam,
  updateDepartment,
};
