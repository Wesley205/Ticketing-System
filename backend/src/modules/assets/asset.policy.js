const {
  canManageAssets,
  canUpdateAssetStatus,
  canViewAsset,
  constrainAssetVisibility,
} = require('../../utils/authorization');

function buildAssetVisibility(user) {
  const visibility = { clauses: [], params: [] };
  constrainAssetVisibility(user, {
    clauses: visibility.clauses,
    params: visibility.params,
    alias: 'a',
  });
  return visibility;
}

function canDeleteAsset(user) {
  return canManageAssets(user) && user?.role === 'admin';
}

module.exports = {
  buildAssetVisibility,
  canAssignAsset: canManageAssets,
  canCreateAsset: canManageAssets,
  canDeleteAsset,
  canReturnAsset: canManageAssets,
  canUpdateAsset: canManageAssets,
  canUpdateAssetStatus,
  canViewAsset,
};
