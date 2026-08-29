const pool = require('../../config/db');
const AppError = require('../../errors/AppError');
const { ERROR_CODES } = require('../../errors/errorCodes');
const { withTransaction } = require('../../utils/transactions');
const { logAction } = require('../../utils/audit');
const mapper = require('./department.mapper');
const policy = require('./department.policy');
const repository = require('./department.repository');
const { DEPARTMENT_ERROR_MESSAGES } = require('./department.constants');

function forbidden(message) {
  return new AppError({
    code: ERROR_CODES.AUTHORIZATION_FAILED,
    statusCode: 403,
    message,
  });
}

async function listDepartments(actorUser, executor = pool) {
  const rows = await repository.listDepartments(executor, policy.buildDepartmentListScope(actorUser));
  return rows.map(mapper.mapDepartmentRow);
}

async function getDepartmentDetails(departmentId, actorUser, executor = pool) {
  if (!policy.canViewDepartment(actorUser, departmentId)) {
    throw forbidden(DEPARTMENT_ERROR_MESSAGES.detailForbidden);
  }

  const department = await repository.findDepartmentById(executor, departmentId);
  if (!department) return null;

  const [staff, assets, serviceRequests] = await Promise.all([
    repository.listDepartmentStaff(executor, departmentId),
    repository.listDepartmentAssets(executor, departmentId),
    repository.listDepartmentServiceRequests(executor, departmentId),
  ]);

  return mapper.mapDepartmentDetail({
    department,
    staff,
    assets,
    serviceRequests,
  });
}

async function createDepartment({ name, description, actorUserId }, executor) {
  return withTransaction(async (client) => {
    const department = await repository.insertDepartment(client, {
      name,
      description,
    });

    await logAction(
      actorUserId,
      'Department added',
      'department',
      department.department_id,
      `Added department ${name}`,
      client
    );

    return department;
  }, executor);
}

async function updateDepartment({ departmentId, name, description, actorUserId }, executor) {
  return withTransaction(async (client) => {
    const department = await repository.updateDepartment(client, {
      departmentId,
      name,
      description,
    });

    if (!department) return null;

    await logAction(
      actorUserId,
      'Department edited',
      'department',
      departmentId,
      `Updated department ${department.name}`,
      client
    );

    return department;
  }, executor);
}

module.exports = {
  createDepartment,
  getDepartmentDetails,
  listDepartments,
  updateDepartment,
};
