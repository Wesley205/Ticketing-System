const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const DEFAULT_RATE_LIMIT_MAX = 120;
const AppError = require('../errors/AppError');
const { ERROR_CODES } = require('../errors/errorCodes');

function getClientKey(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function createRateLimiter(options = {}) {
  const windowMs = Number(options.windowMs) > 0 ? Number(options.windowMs) : DEFAULT_RATE_LIMIT_WINDOW_MS;
  const max = Number(options.max) > 0 ? Number(options.max) : DEFAULT_RATE_LIMIT_MAX;
  const store = options.store || new Map();
  const now = options.now || (() => Date.now());
  const keyGenerator = options.keyGenerator || getClientKey;

  return function rateLimit(req, res, next) {
    const currentTime = now();
    const key = keyGenerator(req);
    const record = store.get(key);

    if (!record || record.resetAt <= currentTime) {
      store.set(key, {
        count: 1,
        resetAt: currentTime + windowMs,
      });
      res.setHeader('RateLimit-Limit', String(max));
      res.setHeader('RateLimit-Remaining', String(max - 1));
      return next();
    }

    record.count += 1;
    const remaining = Math.max(max - record.count, 0);
    const retryAfterSeconds = Math.max(Math.ceil((record.resetAt - currentTime) / 1000), 1);

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(record.resetAt / 1000)));

    if (record.count > max) {
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return next(new AppError({
        code: ERROR_CODES.RATE_LIMITED,
        statusCode: 429,
      }));
    }

    return next();
  };
}

module.exports = {
  DEFAULT_RATE_LIMIT_MAX,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  createRateLimiter,
  getClientKey,
};
