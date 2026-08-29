const {
  ASSET_CONDITIONS,
  ASSET_RETURN_CONDITIONS,
  ASSET_STATUSES,
} = require('../../shared/constants/domain');

const ASSET_TYPES = Object.freeze([
  'Laptop',
  'Desktop',
  'Printer',
  'Scanner',
  'Router',
  'Switch',
  'Server',
  'Monitor',
  'UPS',
  'Projector',
  'Other',
]);

const ASSET_ERROR_MESSAGES = Object.freeze({
  assignForbidden: 'You do not have permission to assign assets.',
  assignFailed: 'Failed to assign asset.',
  createDuplicate: 'Asset tag or serial number already exists.',
  createFailed: 'Failed to create asset.',
  createForbidden: 'You do not have permission to create assets.',
  deleteFailed: 'Failed to delete asset.',
  deleteForbidden: 'Only administrators may delete assets.',
  deleted: 'Asset deleted successfully.',
  detailFailed: 'Failed to load asset.',
  invalidReturnedCondition: 'Invalid returned condition.',
  invalidStatus: 'Invalid status value.',
  invalidTargetStatus: 'Invalid target asset status.',
  listFailed: 'Failed to load assets.',
  notFound: 'Asset not found.',
  returnFailed: 'Failed to return asset.',
  returnForbidden: 'You do not have permission to return assets.',
  returnUnassigned: 'Only assigned assets can be returned.',
  updateFailed: 'Failed to update asset.',
  updateForbidden: 'You do not have permission to update assets.',
  updateStatusFailed: 'Failed to change asset status.',
  updateStatusForbidden: 'You do not have permission to change this asset status.',
  userInactive: 'Assigned user must be an active account.',
});

module.exports = {
  ASSET_CONDITIONS,
  ASSET_ERROR_MESSAGES,
  ASSET_RETURN_CONDITIONS,
  ASSET_STATUSES,
  ASSET_TYPES,
};
