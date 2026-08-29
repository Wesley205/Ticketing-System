const service = require('./maintenance.service');
const { MAINTENANCE_ERROR_MESSAGES } = require('./maintenance.constants');

function sendMaintenanceError(res, err, fallbackMessage, fallbackStatus = 500) {
  if (err.statusCode === 400 || err.status === 400) {
    return res.status(400).json({ error: err.message });
  }
  if (err.statusCode === 403 || err.status === 403) {
    return res.status(403).json({ error: err.message });
  }
  console.error(err);
  return res.status(fallbackStatus).json({ error: err.message || fallbackMessage });
}

function parseScheduleFilters(query) {
  return {
    asset_id: query.asset_id || null,
    is_active: query.is_active === undefined ? undefined : query.is_active === 'true',
  };
}

async function listMaintenance(req, res) {
  try {
    const records = await service.listMaintenanceRecords(req.query, req.user);
    return res.json(records);
  } catch (err) {
    return sendMaintenanceError(res, err, MAINTENANCE_ERROR_MESSAGES.listFailed);
  }
}

async function listSchedules(req, res) {
  try {
    const schedules = await service.listSchedulesForActor(parseScheduleFilters(req.query), req.user);
    return res.json(schedules);
  } catch (err) {
    return sendMaintenanceError(res, err, MAINTENANCE_ERROR_MESSAGES.scheduleListFailed);
  }
}

async function createMaintenance(req, res) {
  try {
    const record = await service.createMaintenanceForActor(req.body, req.user);
    if (!record) {
      return res.status(404).json({ error: MAINTENANCE_ERROR_MESSAGES.assetNotFound });
    }
    return res.status(201).json(record);
  } catch (err) {
    return sendMaintenanceError(res, err, MAINTENANCE_ERROR_MESSAGES.createFailed);
  }
}

async function updateMaintenance(req, res) {
  try {
    const record = await service.updateMaintenanceForActor(req.params.id, {
      action_taken: req.body.action_taken,
      cost: req.body.cost,
      status: req.body.status,
      notes: req.body.notes,
      technician_id: req.body.technician_id || null,
      scheduled_start_at: req.body.scheduled_start_at || null,
      next_due_at: req.body.next_due_at || null,
      checklist_items: Array.isArray(req.body.checklist_items) ? req.body.checklist_items : undefined,
      completion_notes: req.body.completion_notes || null,
      asset_status_override: req.body.asset_status_override || null,
    }, req.user);

    if (!record) {
      return res.status(404).json({ error: MAINTENANCE_ERROR_MESSAGES.detailNotFound });
    }
    return res.json(record);
  } catch (err) {
    return sendMaintenanceError(res, err, MAINTENANCE_ERROR_MESSAGES.updateFailed);
  }
}

async function createSchedule(req, res) {
  try {
    const schedule = await service.createScheduleForActor(req.body, req.user);
    if (!schedule) {
      return res.status(404).json({ error: MAINTENANCE_ERROR_MESSAGES.assetNotFound });
    }
    return res.status(201).json(schedule);
  } catch (err) {
    return sendMaintenanceError(res, err, MAINTENANCE_ERROR_MESSAGES.createScheduleFailed, 400);
  }
}

async function updateSchedule(req, res) {
  try {
    const schedule = await service.updateScheduleForActor(req.params.id, req.body, req.user);
    if (!schedule) {
      return res.status(404).json({ error: MAINTENANCE_ERROR_MESSAGES.scheduleNotFound });
    }
    return res.json(schedule);
  } catch (err) {
    return sendMaintenanceError(res, err, MAINTENANCE_ERROR_MESSAGES.updateScheduleFailed, 400);
  }
}

module.exports = {
  createMaintenance,
  createSchedule,
  listMaintenance,
  listSchedules,
  updateMaintenance,
  updateSchedule,
};
