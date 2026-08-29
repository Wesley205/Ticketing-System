const { logInfo } = require('../utils/logger');

function requestTimer(req, res, next) {
  req.requestStartedAt = process.hrtime.bigint();
  next();
}

function getRequestDurationMs(req) {
  if (!req.requestStartedAt) return null;
  return Math.round(Number(process.hrtime.bigint() - req.requestStartedAt) / 1_000_000);
}

function requestLogger(req, res, next) {
  if (!req.requestStartedAt) {
    req.requestStartedAt = process.hrtime.bigint();
  }

  res.on('finish', () => {
    logInfo('http_request_completed', {
      request_id: req.requestId || null,
      method: req.method,
      path: req.originalUrl || req.url,
      status_code: res.statusCode,
      duration_ms: getRequestDurationMs(req),
      user_id: req.user?.user_id || null,
    });
  });

  next();
}

module.exports = {
  getRequestDurationMs,
  requestLogger,
  requestTimer,
};
