const AppError = require('../errors/AppError');
const { DEFAULT_ERROR_MESSAGES, ERROR_CODES } = require('../errors/errorCodes');
const { mapDatabaseError: mapDatabasePrimitiveError } = require('../database/errors');
const { logError } = require('../logging/logger');
const { sendError } = require('../utils/response');

function normalizeValidationDetails(errors) {
  if (!Array.isArray(errors)) return [];

  return errors.map((error) => ({
    field: error.path || error.param || error.field || null,
    message: error.msg || error.message || String(error),
  }));
}

function mapDatabaseError(err) {
  const mapped = mapDatabasePrimitiveError(err);
  if (!mapped) return null;

  return new AppError({
    code: mapped.code,
    statusCode: mapped.statusCode,
    message: DEFAULT_ERROR_MESSAGES[mapped.code] || mapped.message,
    isOperational: mapped.isOperational,
    cause: err,
  });
}

function mapKnownError(err) {
  if (err instanceof AppError) return err;

  if (err?.array && typeof err.array === 'function') {
    return new AppError({
      code: ERROR_CODES.VALIDATION_ERROR,
      statusCode: 400,
      details: normalizeValidationDetails(err.array()),
      cause: err,
    });
  }

  if (Array.isArray(err?.errors)) {
    return new AppError({
      code: ERROR_CODES.VALIDATION_ERROR,
      statusCode: 400,
      details: normalizeValidationDetails(err.errors),
      cause: err,
    });
  }

  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return new AppError({
      code: ERROR_CODES.PAYLOAD_TOO_LARGE,
      statusCode: 413,
      cause: err,
    });
  }

  if (err?.status === 415 || err?.statusCode === 415) {
    return new AppError({
      code: ERROR_CODES.CONTENT_TYPE_UNSUPPORTED,
      statusCode: 415,
      message: err.message || DEFAULT_ERROR_MESSAGES.CONTENT_TYPE_UNSUPPORTED,
      cause: err,
    });
  }

  if (err?.status === 401 || err?.statusCode === 401 || err?.name === 'UnauthorizedError' || err?.name === 'JsonWebTokenError') {
    return new AppError({
      code: ERROR_CODES.AUTHENTICATION_REQUIRED,
      statusCode: 401,
      message: err.message || DEFAULT_ERROR_MESSAGES.AUTHENTICATION_REQUIRED,
      cause: err,
    });
  }

  if (err?.status === 403 || err?.statusCode === 403) {
    return new AppError({
      code: ERROR_CODES.AUTHORIZATION_FAILED,
      statusCode: 403,
      message: err.message || DEFAULT_ERROR_MESSAGES.AUTHORIZATION_FAILED,
      cause: err,
    });
  }

  const databaseError = mapDatabaseError(err || {});
  if (databaseError) return databaseError;

  return new AppError({
    code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    statusCode: 500,
    isOperational: false,
    cause: err,
  });
}

function shouldExposeStack(env = process.env) {
  return String(env.NODE_ENV || '').toLowerCase() !== 'production' &&
    String(env.SHOW_ERROR_STACKS || '').toLowerCase() === 'true';
}

function errorHandler(err, req, res, next) {
  const appError = mapKnownError(err);
  const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

  logError('http_request_failed', err, {
    request_id: req.requestId || null,
    method: req.method,
    path: req.originalUrl || req.url,
    status_code: appError.statusCode,
    error_code: appError.code,
    is_operational: appError.isOperational,
  });

  const responseError = (!appError.isOperational && isProduction)
    ? new AppError({
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      statusCode: 500,
      isOperational: false,
    })
    : appError;

  return sendError(res, req, responseError, {
    includeStack: shouldExposeStack(process.env),
  });
}

module.exports = {
  errorHandler,
  mapDatabaseError,
  mapKnownError,
  normalizeValidationDetails,
  shouldExposeStack,
};
