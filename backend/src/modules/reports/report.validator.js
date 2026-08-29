const { query, validationResult } = require('express-validator');
const { TICKET_TYPES } = require('./report.constants');

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

const commonFilters = [
  query('date_from').optional().custom(isValidDateOrEmpty).withMessage('date_from must be a valid date.'),
  query('date_to').optional().custom(isValidDateOrEmpty).withMessage('date_to must be a valid date.'),
  query('date_to').optional().custom((value, { req }) => {
    if (!value || !req.query.date_from) return true;
    const from = new Date(req.query.date_from);
    const to = new Date(value);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return true;
    if (from > to) throw new Error('date_from cannot be after date_to.');
    return true;
  }),
  query('department_id').optional().isInt({ min: 1 }).withMessage('Department id must be a positive integer.'),
  query('technician_id').optional().isInt({ min: 1 }).withMessage('Technician id must be a positive integer.'),
  query('category').optional().trim().isLength({ max: 80 }).withMessage('Category is too long.'),
  query('ticket_type').optional().isIn(TICKET_TYPES).withMessage('Invalid ticket type.'),
];

const summary = [
  ...commonFilters,
  sendFirstValidationError,
];

const paginatedRows = [
  ...commonFilters,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('page_size').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100.'),
  sendFirstValidationError,
];

const exportCsv = [
  ...commonFilters,
  sendFirstValidationError,
];

module.exports = {
  exportCsv,
  paginatedRows,
  summary,
};
