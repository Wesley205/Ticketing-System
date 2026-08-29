const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/authorize');
const controller = require('./asset.controller');
const policy = require('./asset.policy');
const validator = require('./asset.validator');
const { ASSET_ERROR_MESSAGES } = require('./asset.constants');

const router = express.Router();

router.get(
  '/',
  requireAuth,
  validator.listAssets,
  controller.listAssets
);

router.get(
  '/:id',
  requireAuth,
  validator.assetIdParam,
  controller.getAssetDetails
);

router.post(
  '/',
  requireAuth,
  requirePermission(policy.canCreateAsset, ASSET_ERROR_MESSAGES.createForbidden),
  validator.createAsset,
  controller.createAsset
);

router.put(
  '/:id',
  requireAuth,
  requirePermission(policy.canUpdateAsset, ASSET_ERROR_MESSAGES.updateForbidden),
  validator.updateAsset,
  controller.updateAsset
);

router.patch(
  '/:id/status',
  requireAuth,
  validator.updateStatus,
  controller.updateStatus
);

router.patch(
  '/:id/assign',
  requireAuth,
  requirePermission(policy.canAssignAsset, ASSET_ERROR_MESSAGES.assignForbidden),
  validator.assignAsset,
  controller.assignAsset
);

router.patch(
  '/:id/return',
  requireAuth,
  requirePermission(policy.canReturnAsset, ASSET_ERROR_MESSAGES.returnForbidden),
  validator.returnAsset,
  controller.returnAsset
);

router.delete(
  '/:id',
  requireAuth,
  requirePermission(policy.canDeleteAsset, ASSET_ERROR_MESSAGES.deleteForbidden),
  validator.assetIdParam,
  controller.deleteAsset
);

module.exports = router;
