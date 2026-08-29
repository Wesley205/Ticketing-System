const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const AppError = require("../../errors/AppError");
const { ERROR_CODES } = require("../../errors/errorCodes");
const { logAction } = require("../../utils/audit");
const {
  getLockoutMessage,
  isAccountLocked,
  recordFailedLogin,
  resetLoginProtection,
  validatePasswordStrength,
} = require("../../utils/authSecurity");
const {
  DEFAULT_JWT_EXPIRES_IN,
  DEFAULT_PASSWORD_RESET_EXPIRES_MINUTES,
  DEFAULT_PASSWORD_RESET_TOKEN_BYTES,
  GENERIC_INVALID_CREDENTIALS,
} = require("./auth.constants");
const mapper = require("./auth.mapper");
const { checkAccountStatus } = require("./auth.policy");
const repository = require("./auth.repository");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeIdentifier(identifier) {
  return String(identifier || "").trim().toLowerCase();
}

function isValidJwtExpiration(value) {
  const raw = String(value || "").trim();
  if (!raw) return false;
  if (/^[1-9]\d*$/.test(raw)) return true;
  return /^[1-9]\d*(ms|s|m|h|d)$/i.test(raw);
}

function getJwtConfig(env = process.env) {
  const secret = env.JWT_SECRET;
  const expiresIn = env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN;

  if (!secret) {
    throw new AppError({
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      statusCode: 500,
      message: "Authentication is not configured.",
      isOperational: false,
    });
  }

  if (!isValidJwtExpiration(expiresIn)) {
    throw new AppError({
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      statusCode: 500,
      message: "Authentication token expiration is not configured correctly.",
      isOperational: false,
    });
  }

  return { secret, expiresIn };
}

function issueToken(user, env = process.env) {
  const { secret, expiresIn } = getJwtConfig(env);

  return jwt.sign(
    {
      user_id: user.user_id,
      session_version: user.session_version,
      role: user.role,
      user_type: user.user_type,
      full_name: user.full_name,
    },
    secret,
    { expiresIn },
  );
}

function verifyToken(token, env = process.env) {
  const { secret } = getJwtConfig(env);
  return jwt.verify(token, secret);
}

function accountStatusError(status) {
  return new AppError({
    code: status.statusCode === 401 ? ERROR_CODES.AUTHENTICATION_REQUIRED : ERROR_CODES.AUTHORIZATION_FAILED,
    statusCode: status.statusCode,
    message: status.message,
  });
}

function invalidCredentialError() {
  return new AppError({
    code: ERROR_CODES.INVALID_CREDENTIALS,
    statusCode: 401,
    message: GENERIC_INVALID_CREDENTIALS,
  });
}

async function findUserForAuthentication(executor, identifier) {
  return repository.findUserForAuthentication(executor, normalizeIdentifier(identifier));
}

async function findUserForSession(executor, userId) {
  return repository.findUserForSession(executor, userId);
}

async function loginUser(executor, { identifier, password }) {
  const user = await findUserForAuthentication(executor, identifier);

  if (!user) {
    throw invalidCredentialError();
  }

  if (isAccountLocked(user)) {
    await logAction(user.user_id, "Login blocked - locked account", "user", user.user_id, `${user.full_name} attempted to log in while locked`, executor);
    throw new AppError({
      code: ERROR_CODES.RATE_LIMITED,
      statusCode: 429,
      message: getLockoutMessage(user),
    });
  }

  const status = checkAccountStatus(user);
  if (!status.valid) {
    if (status.expired) {
      await repository.deactivateExpiredAccount(executor, user.user_id);
      await logAction(user.user_id, "Login blocked - expired account", "user", user.user_id, `${user.full_name} attempted to log in after account expiry`, executor);
    } else {
      await logAction(user.user_id, `Login blocked - ${status.reason} account`, "user", user.user_id, `${user.full_name} attempted to log in while ${status.reason}`, executor);
    }
    throw accountStatusError(status);
  }

  const match = await bcrypt.compare(String(password || ""), user.password_hash);
  if (!match) {
    const failure = await recordFailedLogin(executor, user.user_id);
    await logAction(user.user_id, "Login failed", "user", user.user_id, `${user.full_name} failed password authentication`, executor);

    if (isAccountLocked(failure)) {
      throw new AppError({
        code: ERROR_CODES.RATE_LIMITED,
        statusCode: 429,
        message: getLockoutMessage(failure),
      });
    }

    throw invalidCredentialError();
  }

  await resetLoginProtection(executor, user.user_id);
  await logAction(user.user_id, "User logged in", "user", user.user_id, `${user.full_name} logged in`, executor);

  return mapper.mapSession(user, issueToken(user));
}

function createOpaqueToken(bytes = DEFAULT_PASSWORD_RESET_TOKEN_BYTES) {
  return crypto.randomBytes(bytes).toString("hex");
}

function hashOpaqueToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

async function createPasswordResetToken(executor, email, options = {}) {
  const normalizedEmail = normalizeEmail(email);
  const token = createOpaqueToken(options.tokenBytes || DEFAULT_PASSWORD_RESET_TOKEN_BYTES);
  const tokenHash = hashOpaqueToken(token);
  const expiresInMinutes = options.expiresInMinutes || DEFAULT_PASSWORD_RESET_EXPIRES_MINUTES;

  const user = await repository.findActiveUserForPasswordReset(executor, normalizedEmail);
  if (!user) {
    return { created: false, token: null, token_hash: null };
  }

  await repository.createPasswordResetToken(executor, user.user_id, tokenHash, expiresInMinutes);
  await logAction(user.user_id, "Password reset requested", "user", user.user_id, `${user.full_name} requested a password reset`, executor);

  return { created: true, token, token_hash: tokenHash, user_id: user.user_id };
}

async function resetPasswordWithToken(executor, { token, password }) {
  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    throw new AppError({
      code: ERROR_CODES.VALIDATION_ERROR,
      statusCode: 400,
      message: passwordError,
      details: [{ field: "password", message: passwordError }],
    });
  }

  const tokenHash = hashOpaqueToken(token);
  const resetToken = await repository.findUsablePasswordResetToken(executor, tokenHash);
  if (!resetToken) {
    throw new AppError({
      code: ERROR_CODES.AUTHENTICATION_REQUIRED,
      statusCode: 401,
      message: "Invalid or expired password reset token.",
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await repository.updatePasswordFromReset(executor, resetToken.user_id, passwordHash);
  await repository.markPasswordResetTokenUsed(executor, resetToken.password_reset_token_id);
  await logAction(resetToken.user_id, "Password reset completed", "user", resetToken.user_id, `${resetToken.full_name} reset their password`, executor);

  return { user_id: resetToken.user_id };
}

async function logoutUser(executor, user) {
  await repository.incrementSessionVersion(executor, user.user_id);
  await logAction(
    user.user_id,
    "User logged out",
    "user",
    user.user_id,
    `${user.full_name} logged out`,
    executor,
  );
  return { logged_out: true };
}

module.exports = {
  DEFAULT_JWT_EXPIRES_IN,
  DEFAULT_PASSWORD_RESET_EXPIRES_MINUTES,
  GENERIC_INVALID_CREDENTIALS,
  checkAccountStatus,
  createOpaqueToken,
  createPasswordResetToken,
  findUserForAuthentication,
  findUserForSession,
  getJwtConfig,
  hashOpaqueToken,
  invalidCredentialError,
  isValidJwtExpiration,
  issueToken,
  loginUser,
  logoutUser,
  normalizeEmail,
  normalizeIdentifier,
  resetPasswordWithToken,
  sanitizeUser: mapper.sanitizeUser,
  verifyToken,
  withFrontendAccessProfile: mapper.withFrontendAccessProfile,
};
