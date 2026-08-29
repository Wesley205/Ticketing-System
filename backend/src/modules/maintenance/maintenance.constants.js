const {
  ASSET_STATUSES,
  MAINTENANCE_FREQUENCY_UNITS,
  MAINTENANCE_SCHEDULE_TYPES,
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
} = require('../../shared/constants/domain');

const MAINTENANCE_ERROR_MESSAGES = Object.freeze({
  assetNotFound: 'Asset not found.',
  createForbidden: 'You do not have permission to create maintenance for this asset.',
  createFailed: 'Failed to create maintenance record.',
  createScheduleForbidden: 'You do not have permission to schedule maintenance for this asset.',
  createScheduleFailed: 'Failed to create maintenance schedule.',
  detailNotFound: 'Maintenance record not found.',
  invalidStatus: 'Invalid maintenance status.',
  listFailed: 'Failed to load maintenance records.',
  scheduleListFailed: 'Failed to load maintenance schedules.',
  scheduleNotFound: 'Maintenance schedule not found.',
  updateForbidden: 'You do not have permission to update this maintenance record.',
  updateFailed: 'Failed to update maintenance record.',
  updateScheduleForbidden: 'You do not have permission to update this maintenance schedule.',
  updateScheduleFailed: 'Failed to update maintenance schedule.',
});

module.exports = {
  ASSET_STATUSES,
  MAINTENANCE_ERROR_MESSAGES,
  MAINTENANCE_FREQUENCY_UNITS,
  MAINTENANCE_SCHEDULE_TYPES,
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
};
