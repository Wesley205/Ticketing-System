const service = require('./department.service');
const { DEPARTMENT_ERROR_MESSAGES } = require('./department.constants');

function sendError(res, err, fallbackMessage) {
  if (err.statusCode === 403 || err.status === 403) {
    return res.status(403).json({ error: err.message });
  }
  if (err.code === '23505') {
    return res.status(409).json({ error: DEPARTMENT_ERROR_MESSAGES.createDuplicate });
  }

  console.error(err);
  return res.status(500).json({ error: fallbackMessage });
}

async function listDepartments(req, res) {
  try {
    const departments = await service.listDepartments(req.user);
    return res.json(departments);
  } catch (err) {
    return sendError(res, err, DEPARTMENT_ERROR_MESSAGES.listFailed);
  }
}

async function getDepartmentDetails(req, res) {
  try {
    const department = await service.getDepartmentDetails(req.params.id, req.user);
    if (!department) {
      return res.status(404).json({ error: DEPARTMENT_ERROR_MESSAGES.notFound });
    }
    return res.json(department);
  } catch (err) {
    return sendError(res, err, DEPARTMENT_ERROR_MESSAGES.detailFailed);
  }
}

async function createDepartment(req, res) {
  try {
    const department = await service.createDepartment({
      name: req.body.name,
      description: req.body.description,
      actorUserId: req.user.user_id,
    });
    return res.status(201).json(department);
  } catch (err) {
    return sendError(res, err, DEPARTMENT_ERROR_MESSAGES.createFailed);
  }
}

async function updateDepartment(req, res) {
  try {
    const department = await service.updateDepartment({
      departmentId: req.params.id,
      name: req.body.name,
      description: req.body.description,
      actorUserId: req.user.user_id,
    });
    if (!department) {
      return res.status(404).json({ error: DEPARTMENT_ERROR_MESSAGES.notFound });
    }
    return res.json(department);
  } catch (err) {
    return sendError(res, err, DEPARTMENT_ERROR_MESSAGES.updateFailed);
  }
}

module.exports = {
  createDepartment,
  getDepartmentDetails,
  listDepartments,
  updateDepartment,
};
