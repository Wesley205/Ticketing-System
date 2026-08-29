const { body, param, query, validationResult } = require('express-validator');
const {
  ASSET_CONDITIONS,
  ASSET_RETURN_CONDITIONS,
  ASSET_STATUSES,
  ASSET_TYPES,
} = require('./asset.constants');

function sendFirstValidationError(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  return next();
}

const assetIdParamOnly = [
  param('id').isInt({ min: 1 }).withMessage('Asset id must be a positive integer.'),
];

const assetIdParam = [
  ...assetIdParamOnly,
  sendFirstValidationError,
];

const listAssets = [
  query('search').optional().trim().isLength({ max: 120 }).withMessage('Search is too long.'),
  query('status').optional().isIn(ASSET_STATUSES).withMessage('Invalid status value.'),
  query('asset_type').optional().isIn(ASSET_TYPES).withMessage('Invalid asset type.'),
  query('department_id').optional().isInt({ min: 1 }).withMessage('Department id must be a positive integer.'),
  sendFirstValidationError,
];

const createAsset = [
  body('asset_tag').trim().notEmpty().withMessage('Asset tag is required'),
  body('asset_type').notEmpty().withMessage('Asset type is required'),
  body('asset_type').optional().isIn(ASSET_TYPES).withMessage('Invalid asset type.'),
  body('condition').optional({ nullable: true }).isIn(ASSET_CONDITIONS).withMessage('Invalid condition.'),
  body('status').optional({ nullable: true }).isIn(ASSET_STATUSES).withMessage('Invalid status value.'),
  body('department_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Department id must be a positive integer.'),
  body('assigned_to').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Assigned user id must be a positive integer.'),
  sendFirstValidationError,
];

const updateAsset = [
  ...assetIdParamOnly,
  body('asset_type').optional({ nullable: true }).isIn(ASSET_TYPES).withMessage('Invalid asset type.'),
  body('condition').optional({ nullable: true }).isIn(ASSET_CONDITIONS).withMessage('Invalid condition.'),
  body('status').optional({ nullable: true }).isIn(ASSET_STATUSES).withMessage('Invalid status value.'),
  body('department_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Department id must be a positive integer.'),
  body('assigned_to').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Assigned user id must be a positive integer.'),
  sendFirstValidationError,
];

const updateStatus = [
  ...assetIdParamOnly,
  body('status').isIn(ASSET_STATUSES).withMessage('Invalid status value.'),
  sendFirstValidationError,
];

const assignAsset = [
  ...assetIdParamOnly,
  body('assigned_to').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Assigned user id must be a positive integer.'),
  sendFirstValidationError,
];

const returnAsset = [
  ...assetIdParamOnly,
  body('returned_condition').optional({ nullable: true }).isIn(ASSET_RETURN_CONDITIONS).withMessage('Invalid returned condition.'),
  body('target_status').optional({ nullable: true }).isIn(ASSET_STATUSES).withMessage('Invalid target asset status.'),
  sendFirstValidationError,
];

module.exports = {
  assetIdParam,
  assignAsset,
  createAsset,
  listAssets,
  returnAsset,
  updateAsset,
  updateStatus,
};
