const express = require('express');
const cors = require('cors');
const AppError = require('../errors/AppError');
const { ERROR_CODES } = require('../errors/errorCodes');
const {
  getCorsOptions,
  normalizeEnv,
  parseBoolean,
  parsePositiveInteger,
} = require('../config');
const { createRateLimiter } = require('./rateLimit');
const { requestId } = require('./requestId');
const { requestLogger, requestTimer } = require('./requestLogger');
const {
  buildContentSecurityPolicy,
  securityHeaders,
} = require('./securityHeaders');

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

function configureTrustProxy(app, env = process.env) {
  const raw = env.TRUST_PROXY;

  if (raw === undefined || raw === null || raw === '') {
    app.set('trust proxy', false);
    return false;
  }

  const normalized = String(raw).trim().toLowerCase();
  if (/^\d+$/.test(normalized)) {
    const hops = Number(normalized);
    app.set('trust proxy', hops);
    return hops;
  }

  const value = parseBoolean(normalized, false);
  app.set('trust proxy', value);
  return value;
}

function contentTypeGuard(req, res, next) {
  if (!BODY_METHODS.has(req.method)) return next();
  if (!req.headers['content-length'] && !req.headers['transfer-encoding']) return next();
  if (req.is('application/json') || req.is('application/x-www-form-urlencoded')) return next();

  return next(new AppError({
    code: ERROR_CODES.CONTENT_TYPE_UNSUPPORTED,
    statusCode: 415,
    message: 'Unsupported content type. Use application/json or application/x-www-form-urlencoded.',
  }));
}

function createSecurityMiddleware(env = process.env) {
  const config = normalizeEnv(env);
  const rateLimit = createRateLimiter({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
  });

  return [
    requestId,
    requestTimer,
    requestLogger,
    securityHeaders,
    cors(getCorsOptions(env)),
    rateLimit,
    contentTypeGuard,
    express.json({ limit: config.jsonBodyLimit }),
    express.urlencoded({ limit: config.urlencodedBodyLimit, extended: false }),
  ];
}

module.exports = {
  BODY_METHODS,
  buildContentSecurityPolicy,
  configureTrustProxy,
  contentTypeGuard,
  createSecurityMiddleware,
  securityHeaders,
};
