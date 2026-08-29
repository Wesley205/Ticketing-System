const pool = require("../config/db");
const AppError = require("../errors/AppError");
const { ERROR_CODES } = require("../errors/errorCodes");
const {
  checkAccountStatus,
  findUserForSession,
  verifyToken,
} = require("../services/auth");

function authenticationError(message) {
  return new AppError({
    code: ERROR_CODES.AUTHENTICATION_REQUIRED,
    statusCode: 401,
    message,
  });
}

function authorizationError(message) {
  return new AppError({
    code: ERROR_CODES.AUTHORIZATION_FAILED,
    statusCode: 403,
    message,
  });
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return next(authenticationError("Authentication required. Please log in."));
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    return next(authenticationError("Invalid or expired session. Please log in again."));
  }

  try {
    const user = await findUserForSession(pool, payload.user_id);

    if (!user) {
      return next(authenticationError("Account not found. Please log in again."));
    }

    if (!payload.session_version || Number(payload.session_version) !== Number(user.session_version)) {
      return next(authenticationError("Session is no longer valid. Please log in again."));
    }

    const status = checkAccountStatus(user);
    if (!status.valid) {
      return next(status.statusCode === 401
        ? authenticationError(status.message)
        : authorizationError(status.message));
    }

    req.user = {
      user_id: user.user_id,
      full_name: user.full_name,
      role: user.role,
      user_type: user.user_type,
      department_id: user.department_id,
    };
    next();
  } catch (err) {
    return next(err);
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(authenticationError("Authentication required."));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(authorizationError("You do not have permission to perform this action."));
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
