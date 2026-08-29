const {
  ACCOUNT_STATUSES,
  TEMPORARY_USER_TYPES,
  USER_ROLES,
  USER_TYPES,
} = require('../../shared/constants/domain');

const STAFF_ERROR_MESSAGES = Object.freeze({
  createFailed: 'Failed to create staff account.',
  duplicateCreate: 'Email or username already in use.',
  duplicateUpdate: 'Email already in use.',
  extendFailed: 'Failed to extend temporary account.',
  extendMissingDate: 'A new account expiration date is required.',
  listFailed: 'Failed to load staff.',
  notFound: 'Staff member not found.',
  statusFailed: 'Failed to change account status.',
  techniciansFailed: 'Failed to load technicians.',
  updateFailed: 'Failed to update staff member.',
});

module.exports = {
  ACCOUNT_STATUSES,
  SALT_ROUNDS: 12,
  STAFF_ERROR_MESSAGES,
  TEMPORARY_USER_TYPES,
  USER_ROLES,
  USER_TYPES,
};
