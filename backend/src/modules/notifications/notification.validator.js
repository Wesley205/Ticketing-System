const { body, param, query, validationResult } = require('express-validator');
const { PREFERENCE_FIELDS } = require('./notification.constants');

function sendFirstValidationError(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  return next();
}

const listNotifications = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Notification limit must be between 1 and 100.'),
  query('unread').optional().isBoolean().withMessage('Unread filter must be a boolean.'),
  sendFirstValidationError,
];

const markRead = [
  param('id').isInt({ min: 1 }).withMessage('Notification id must be a positive integer.'),
  sendFirstValidationError,
];

const updatePreferences = [
  ...PREFERENCE_FIELDS.map((field) =>
    body(field).optional().isBoolean().withMessage('Invalid notification preference payload.')
  ),
  sendFirstValidationError,
];

module.exports = {
  listNotifications,
  markRead,
  updatePreferences,
};
