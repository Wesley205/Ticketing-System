const service = require('./asset.service');
const { ASSET_ERROR_MESSAGES } = require('./asset.constants');

function sendAssetError(res, err, fallbackMessage) {
  if (err.statusCode === 400 || err.status === 400) {
    return res.status(400).json({ error: err.message });
  }
  if (err.statusCode === 403 || err.status === 403) {
    return res.status(403).json({ error: err.message });
  }
  if (err.code === '23505') {
    return res.status(409).json({ error: ASSET_ERROR_MESSAGES.createDuplicate });
  }

  console.error(err);
  return res.status(500).json({ error: fallbackMessage });
}

async function listAssets(req, res) {
  try {
    const assets = await service.listAssets(req.query, req.user);
    return res.json(assets);
  } catch (err) {
    return sendAssetError(res, err, ASSET_ERROR_MESSAGES.listFailed);
  }
}

async function getAssetDetails(req, res) {
  try {
    const asset = await service.getAssetDetails(req.params.id, req.user);
    if (!asset) {
      return res.status(404).json({ error: ASSET_ERROR_MESSAGES.notFound });
    }
    return res.json(asset);
  } catch (err) {
    return sendAssetError(res, err, ASSET_ERROR_MESSAGES.detailFailed);
  }
}

async function createAsset(req, res) {
  try {
    const asset = await service.createAssetRecord(req.body, req.user);
    return res.status(201).json(asset);
  } catch (err) {
    return sendAssetError(res, err, ASSET_ERROR_MESSAGES.createFailed);
  }
}

async function updateAsset(req, res) {
  try {
    const asset = await service.updateAssetRecord(req.params.id, req.body, req.user.user_id);
    if (!asset) {
      return res.status(404).json({ error: ASSET_ERROR_MESSAGES.notFound });
    }
    return res.json(asset);
  } catch (err) {
    return sendAssetError(res, err, ASSET_ERROR_MESSAGES.updateFailed);
  }
}

async function updateStatus(req, res) {
  try {
    const asset = await service.updateAssetStatusForActor(req.params.id, req.body.status, req.user);
    if (!asset) {
      return res.status(404).json({ error: ASSET_ERROR_MESSAGES.notFound });
    }
    return res.json(asset);
  } catch (err) {
    return sendAssetError(res, err, ASSET_ERROR_MESSAGES.updateStatusFailed);
  }
}

async function assignAsset(req, res) {
  try {
    const asset = await service.assignAssetForActor(req.params.id, req.body.assigned_to || null, req.user, {
      assignment_notes: req.body.assignment_notes || null,
      expected_return_at: req.body.expected_return_at || null,
    });
    if (!asset) {
      return res.status(404).json({ error: ASSET_ERROR_MESSAGES.notFound });
    }
    return res.json(asset);
  } catch (err) {
    return sendAssetError(res, err, ASSET_ERROR_MESSAGES.assignFailed);
  }
}

async function returnAsset(req, res) {
  try {
    const asset = await service.returnAssetForActor(req.params.id, req.user, {
      return_notes: req.body.return_notes || null,
      returned_condition: req.body.returned_condition || null,
      target_status: req.body.target_status || null,
    });
    if (!asset) {
      return res.status(404).json({ error: ASSET_ERROR_MESSAGES.notFound });
    }
    return res.json(asset);
  } catch (err) {
    return sendAssetError(res, err, ASSET_ERROR_MESSAGES.returnFailed);
  }
}

async function deleteAsset(req, res) {
  try {
    const result = await service.deleteAssetRecord(req.params.id, req.user);
    if (!result) {
      return res.status(404).json({ error: ASSET_ERROR_MESSAGES.notFound });
    }
    return res.json(result);
  } catch (err) {
    return sendAssetError(res, err, ASSET_ERROR_MESSAGES.deleteFailed);
  }
}

module.exports = {
  assignAsset,
  createAsset,
  deleteAsset,
  getAssetDetails,
  listAssets,
  returnAsset,
  updateAsset,
  updateStatus,
};
