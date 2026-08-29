const { DEFAULT_ERROR_MESSAGES, ERROR_CODES } = require('./errorCodes');

class AppError extends Error {
  constructor({
    code = ERROR_CODES.INTERNAL_SERVER_ERROR,
    message = DEFAULT_ERROR_MESSAGES[code] || DEFAULT_ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    statusCode = 500,
    details = [],
    isOperational = true,
    cause,
  } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.status = statusCode;
    this.details = Array.isArray(details) ? details : [details];
    this.isOperational = isOperational;
  }
}

module.exports = AppError;
