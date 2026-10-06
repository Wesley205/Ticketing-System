const bcrypt = require('bcrypt');
const pool = require('../../config/db');
const { validateManagedUser } = require('../../config/authPolicy');
const { withTransaction } = require('../../utils/transactions');
const { logAction } = require('../../utils/audit');
const repository = require('./staff.repository');
const { mapStaffRow, mapTechnicianRow } = require('./staff.mapper');
const { SALT_ROUNDS } = require('./staff.constants');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeUsername(username) {
  return String(username || '').trim();
}

function validateStaffData(data) {
  const validationError = validateManagedUser(data);
  if (validationError) {
    throw Object.assign(new Error(validationError), { statusCode: 400 });
  }
}

async function listStaff(filters = {}, executor = pool) {
  const rows = await repository.listStaff(executor, filters);
  return rows.map(mapStaffRow);
}

async function listTechnicians(executor = pool) {
  const rows = await repository.listTechnicians(executor);
  return rows.map(mapTechnicianRow);
}

async function createStaffAccount(data, executor) {
  validateStaffData(data);

  return withTransaction(async (client) => {
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const user = await repository.insertStaffAccount(client, {
      ...data,
      email: normalizeEmail(data.email),
      username: normalizeUsername(data.username),
      password_hash: passwordHash,
      user_type: data.user_type || 'employee',
      department_id: data.department_id || null,
      phone: data.phone || null,
      floor_id: data.role === 'technician' ? data.floor_id || null : null,
      technician_availability: data.role === 'technician' ? data.technician_availability || 'available' : 'available',
      technician_capacity: data.role === 'technician' ? Number(data.technician_capacity || 8) : 8,
      sponsor_name: data.sponsor_name || null,
      supervisor_user_id: data.supervisor_user_id || null,
      account_start_date: data.account_start_date || null,
      account_expiration_date: data.account_expiration_date || null,
    });

    await logAction(
      data.actorUserId,
      'Staff record modified',
      'user',
      user.user_id,
      `Created ${data.role} account for ${data.full_name}`,
      client
    );

    return mapStaffRow(user);
  }, executor);
}

async function updateStaffAccount(userId, data, executor) {
  validateStaffData(data);

  return withTransaction(async (client) => {
    const user = await repository.updateStaffAccount(client, userId, {
      full_name: data.full_name,
      email: data.email ? normalizeEmail(data.email) : null,
      role: data.role,
      user_type: data.user_type,
      department_id: data.department_id || null,
      phone: data.phone || null,
      floor_id: data.role === 'technician' ? data.floor_id || null : null,
      technician_availability: data.role === 'technician' ? data.technician_availability || 'available' : 'available',
      technician_capacity: data.role === 'technician' ? Number(data.technician_capacity || 8) : 8,
      sponsor_name: data.sponsor_name || null,
      supervisor_user_id: data.supervisor_user_id || null,
      account_start_date: data.account_start_date || null,
      account_expiration_date: data.account_expiration_date || null,
    });

    if (!user) return null;

    await logAction(
      data.actorUserId,
      'Staff record modified',
      'user',
      userId,
      `Updated profile for ${user.full_name}`,
      client
    );

    return mapStaffRow(user);
  }, executor);
}

async function changeStaffStatus(userId, { is_active, deactivation_reason, actorUserId }, executor) {
  return withTransaction(async (client) => {
    const user = await repository.updateStaffStatus(client, userId, {
      is_active,
      deactivation_reason,
    });

    if (!user) return null;

    await logAction(
      actorUserId,
      'Staff record modified',
      'user',
      userId,
      `${is_active ? 'Activated' : 'Deactivated'} account for ${user.full_name}`,
      client
    );

    return mapStaffRow(user);
  }, executor);
}

async function extendTemporaryAccount(userId, { account_expiration_date, actorUserId }, executor) {
  return withTransaction(async (client) => {
    const user = await repository.extendTemporaryAccount(client, userId, {
      account_expiration_date,
    });

    if (!user) return null;

    await logAction(
      actorUserId,
      'Temporary account extended',
      'user',
      userId,
      `Extended account for ${user.full_name} to ${account_expiration_date}`,
      client
    );

    return mapStaffRow(user);
  }, executor);
}

module.exports = {
  changeStaffStatus,
  createStaffAccount,
  extendTemporaryAccount,
  listStaff,
  listTechnicians,
  updateStaffAccount,
};
