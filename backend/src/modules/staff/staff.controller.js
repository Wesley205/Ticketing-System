const service = require('./staff.service');
const { STAFF_ERROR_MESSAGES } = require('./staff.constants');

function handleStaffError(res, err, messages) {
  if (err.statusCode === 400 || err.status === 400) {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === '23505') {
    return res.status(409).json({ error: messages.duplicate });
  }

  console.error(err);
  return res.status(500).json({ error: messages.fallback });
}

async function listStaff(req, res) {
  try {
    const staff = await service.listStaff(req.query);
    return res.json(staff);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: STAFF_ERROR_MESSAGES.listFailed });
  }
}

async function listTechnicians(_req, res) {
  try {
    const technicians = await service.listTechnicians();
    return res.json(technicians);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: STAFF_ERROR_MESSAGES.techniciansFailed });
  }
}

async function createStaff(req, res) {
  try {
    const user = await service.createStaffAccount({
      ...req.body,
      actorUserId: req.user.user_id,
    });
    return res.status(201).json(user);
  } catch (err) {
    return handleStaffError(res, err, {
      duplicate: STAFF_ERROR_MESSAGES.duplicateCreate,
      fallback: STAFF_ERROR_MESSAGES.createFailed,
    });
  }
}

async function updateStaff(req, res) {
  try {
    const user = await service.updateStaffAccount(req.params.id, {
      ...req.body,
      actorUserId: req.user.user_id,
    });
    if (!user) {
      return res.status(404).json({ error: STAFF_ERROR_MESSAGES.notFound });
    }
    return res.json(user);
  } catch (err) {
    return handleStaffError(res, err, {
      duplicate: STAFF_ERROR_MESSAGES.duplicateUpdate,
      fallback: STAFF_ERROR_MESSAGES.updateFailed,
    });
  }
}

async function updateStatus(req, res) {
  try {
    const user = await service.changeStaffStatus(req.params.id, {
      is_active: req.body.is_active,
      deactivation_reason: req.body.deactivation_reason,
      actorUserId: req.user.user_id,
    });
    if (!user) {
      return res.status(404).json({ error: STAFF_ERROR_MESSAGES.notFound });
    }
    return res.json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: STAFF_ERROR_MESSAGES.statusFailed });
  }
}

async function extendTemporary(req, res) {
  try {
    const user = await service.extendTemporaryAccount(req.params.id, {
      account_expiration_date: req.body.account_expiration_date,
      actorUserId: req.user.user_id,
    });
    if (!user) {
      return res.status(404).json({ error: STAFF_ERROR_MESSAGES.notFound });
    }
    return res.json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: STAFF_ERROR_MESSAGES.extendFailed });
  }
}

module.exports = {
  createStaff,
  extendTemporary,
  listStaff,
  listTechnicians,
  updateStaff,
  updateStatus,
};
