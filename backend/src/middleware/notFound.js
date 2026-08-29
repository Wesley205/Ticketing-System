const AppError = require('../errors/AppError');
const { ERROR_CODES } = require('../errors/errorCodes');

function notFound(req, res, next) {
  next(new AppError({
    code: ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  }));
}

module.exports = notFound;
