const { requestId, REQUEST_ID_HEADER, generateRequestId, sanitizeRequestId } = require('./requestId');
const { requestLogger, requestTimer } = require('./requestLogger');

function requestContext(req, res, next) {
  requestId(req, res, (err) => {
    if (err) return next(err);

    requestTimer(req, res, (timerErr) => {
      if (timerErr) return next(timerErr);
      return requestLogger(req, res, next);
    });
  });
}

module.exports = {
  REQUEST_ID_HEADER,
  generateRequestId,
  requestContext,
  sanitizeRequestId,
};
