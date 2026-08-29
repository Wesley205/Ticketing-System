const AppError = require("../errors/AppError");
const { ERROR_CODES } = require("../errors/errorCodes");
const { isKnownPermission } = require("./permissions");
const { ROLE_PERMISSIONS, TEMPORARY_USER_TYPES } = require("./roles");

const ACTIVE_ACCOUNT_STATUS = "active";

function normalizeRole(role) {
  return typeof role === "string" ? role.trim().toLowerCase() : "";
}

function hasRole(user, ...roles) {
  const role = normalizeRole(user?.role);
  return roles.map(normalizeRole).includes(role);
}

function isTemporaryUser(user) {
  return TEMPORARY_USER_TYPES.includes(user?.user_type);
}

function isExpiredTemporaryUser(user, now = new Date()) {
  if (!isTemporaryUser(user) || !user?.account_expiration_date) {
    return false;
  }

  return new Date(user.account_expiration_date).getTime() < now.getTime();
}

function isActiveUser(user, now = new Date()) {
  if (!user?.user_id) return false;
  if (user.is_active === false) return false;
  if (user.account_status && user.account_status !== ACTIVE_ACCOUNT_STATUS) return false;
  return !isExpiredTemporaryUser(user, now);
}

function getRolePermissions(role) {
  return ROLE_PERMISSIONS[normalizeRole(role)] || [];
}

function getUserPermissions(user) {
  const explicitPermissions = Array.isArray(user?.permissions)
    ? user.permissions.filter(isKnownPermission)
    : [];
  return Array.from(new Set([...getRolePermissions(user?.role), ...explicitPermissions]));
}

function hasPermission(user, permission) {
  if (!isActiveUser(user)) return false;
  if (!isKnownPermission(permission)) return false;
  return getUserPermissions(user).includes(permission);
}

function hasAnyPermission(user, permissions) {
  return permissions.some((permission) => hasPermission(user, permission));
}

function createAuthorizationError(message = "You do not have permission to perform this action.") {
  return new AppError({
    code: ERROR_CODES.AUTHORIZATION_FAILED,
    statusCode: 403,
    message,
  });
}

function createAuthenticationError(message = "Authentication required.") {
  return new AppError({
    code: ERROR_CODES.AUTHENTICATION_REQUIRED,
    statusCode: 401,
    message,
  });
}

function assertPermission(user, permission, message) {
  if (!hasPermission(user, permission)) {
    throw createAuthorizationError(message);
  }
}

function assertActiveUser(user) {
  if (!user?.user_id) {
    throw createAuthenticationError();
  }
  if (!isActiveUser(user)) {
    throw createAuthorizationError("This account is not active.");
  }
}

module.exports = {
  assertActiveUser,
  assertPermission,
  createAuthenticationError,
  createAuthorizationError,
  getUserPermissions,
  hasAnyPermission,
  hasPermission,
  hasRole,
  isActiveUser,
  isExpiredTemporaryUser,
  isTemporaryUser,
};
