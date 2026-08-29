const { body, param, query, validationResult } = require('express-validator');
const {
  MAINTENANCE_FREQUENCY_UNITS,
  MAINTENANCE_SCHEDULE_TYPES,
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
} = require('./maintenance.constants');

function sendFirstValidationError(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  return next();
}

const maintenanceIdParamOnly = [
  param('id').isInt({ min: 1 }).withMessage('Maintenance id must be a positive integer.'),
];

const listMaintenance = [
  query('asset_id').optional().isInt({ min: 1 }).withMessage('Asset id must be a positive integer.'),
  query('status').optional().isIn(MAINTENANCE_STATUSES).withMessage('Invalid maintenance status.'),
  sendFirstValidationError,
];

const listSchedules = [
  query('asset_id').optional().isInt({ min: 1 }).withMessage('Asset id must be a positive integer.'),
  query('is_active').optional().isBoolean().withMessage('is_active must be a boolean.'),
  sendFirstValidationError,
];

const createMaintenance = [
  body('asset_id').isInt({ min: 1 }).withMessage('A valid asset is required'),
  body('problem').trim().notEmpty().withMessage('Problem description is required'),
  body('status').optional({ nullable: true }).isIn(MAINTENANCE_STATUSES).withMessage('Invalid maintenance status.'),
  body('maintenance_type').optional({ nullable: true }).isIn(MAINTENANCE_TYPES).withMessage('Invalid maintenance type.'),
  body('technician_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Technician id must be a positive integer.'),
  body('related_request_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Related request id must be a positive integer.'),
  body('schedule_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Schedule id must be a positive integer.'),
  body('cost').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Cost must be non-negative.'),
  sendFirstValidationError,
];

const updateMaintenance = [
  ...maintenanceIdParamOnly,
  body('status').optional({ nullable: true }).isIn(MAINTENANCE_STATUSES).withMessage('Invalid maintenance status.'),
  body('technician_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Technician id must be a positive integer.'),
  body('cost').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Cost must be non-negative.'),
  sendFirstValidationError,
];

const createSchedule = [
  body('asset_id').isInt({ min: 1 }).withMessage('A valid asset is required'),
  body('title').trim().notEmpty().withMessage('A schedule title is required'),
  body('maintenance_type').optional().isIn(MAINTENANCE_SCHEDULE_TYPES).withMessage('Invalid schedule type'),
  body('frequency_unit').optional().isIn(MAINTENANCE_FREQUENCY_UNITS).withMessage('Invalid frequency unit.'),
  body('frequency_value').optional().isInt({ min: 1 }).withMessage('Frequency value must be positive.'),
  body('assigned_technician_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Assigned technician id must be a positive integer.'),
  body('reminder_days_before').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Reminder days must be zero or more.'),
  sendFirstValidationError,
];

const updateSchedule = [
  ...maintenanceIdParamOnly,
  body('maintenance_type').optional({ nullable: true }).isIn(MAINTENANCE_SCHEDULE_TYPES).withMessage('Invalid schedule type'),
  body('frequency_unit').optional({ nullable: true }).isIn(MAINTENANCE_FREQUENCY_UNITS).withMessage('Invalid frequency unit.'),
  body('frequency_value').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Frequency value must be positive.'),
  body('assigned_technician_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Assigned technician id must be a positive integer.'),
  body('reminder_days_before').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Reminder days must be zero or more.'),
  body('is_active').optional({ nullable: true }).isBoolean().withMessage('is_active must be a boolean.'),
  sendFirstValidationError,
];

module.exports = {
  createMaintenance,
  createSchedule,
  listMaintenance,
  listSchedules,
  updateMaintenance,
  updateSchedule,
};
