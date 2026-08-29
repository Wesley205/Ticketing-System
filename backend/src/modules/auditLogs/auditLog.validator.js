const { query, validationResult } = require('express-validator');

function sendFirstValidationError(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  return next();
}

function isValidDateOrEmpty(value) {
  if (!value) return true;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

const list = [
  query('user_id').optional().isInt({ min: 1 }).withMessage('User id must be a positive integer.'),
  query('action').optional().trim().isLength({ max: 100 }).withMessage('Action filter is too long.'),
  query('from').optional().custom(isValidDateOrEmpty).withMessage('From date must be valid.'),
  query('to').optional().custom(isValidDateOrEmpty).withMessage('To date must be valid.'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000.'),
  sendFirstValidationError,
];

module.exports = {
  list,
};
