const pool = require("../../config/db");
const AppError = require("../../errors/AppError");
const { ERROR_CODES } = require("../../errors/errorCodes");
const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/response");
const { withTransaction } = require("../../utils/transactions");
const service = require("./auth.service");

const disabledRegistration = asyncHandler(async (_req, _res, next) => {
  return next(new AppError({
    code: ERROR_CODES.AUTHORIZATION_FAILED,
    statusCode: 403,
    message: "Public registration has been disabled. Contact an administrator for an invitation or approved account setup.",
  }));
});

const login = asyncHandler(async (req, res) => {
  const session = await service.loginUser(pool, {
    identifier: req.body.identifier,
    password: req.body.password,
  });

  return res.json(session);
});

const logout = asyncHandler(async (req, res) => {
  const result = await service.logoutUser(pool, req.user);
  return sendSuccess(res, result, { req });
});

const me = asyncHandler(async (req, res, next) => {
  const user = await service.findUserForSession(pool, req.user.user_id);

  if (!user) {
    return next(new AppError({
      code: ERROR_CODES.RESOURCE_NOT_FOUND,
      statusCode: 404,
      message: "User not found.",
    }));
  }

  const status = service.checkAccountStatus(user);
  if (!status.valid) {
    return next(new AppError({
      code: status.statusCode === 401 ? ERROR_CODES.AUTHENTICATION_REQUIRED : ERROR_CODES.AUTHORIZATION_FAILED,
      statusCode: status.statusCode,
      message: status.message,
    }));
  }

  return res.json(service.withFrontendAccessProfile(user));
});

const requestPasswordReset = asyncHandler(async (req, res) => {
  await service.createPasswordResetToken(pool, req.body.email);

  return sendSuccess(res, {
    message: "If the account exists and is active, password reset instructions will be sent.",
  }, { req });
});

const confirmPasswordReset = asyncHandler(async (req, res) => {
  await withTransaction((client) =>
    service.resetPasswordWithToken(client, {
      token: req.body.token,
      password: req.body.password,
    })
  );

  return sendSuccess(res, { password_reset: true }, { req });
});

module.exports = {
  confirmPasswordReset,
  disabledRegistration,
  login,
  logout,
  me,
  requestPasswordReset,
};
