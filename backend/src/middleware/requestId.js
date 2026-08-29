const crypto = require('crypto');

const REQUEST_ID_HEADER = 'X-Request-ID';
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:-]{8,128}$/;

function generateRequestId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
}

function sanitizeRequestId(value) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return null;

  const requestId = String(candidate).trim();
  return REQUEST_ID_PATTERN.test(requestId) ? requestId : null;
}

function requestId(req, res, next) {
  const value = sanitizeRequestId(req.headers?.['x-request-id']) || generateRequestId();

  req.requestId = value;
  res.setHeader(REQUEST_ID_HEADER, value);
  next();
}

module.exports = {
  REQUEST_ID_HEADER,
  generateRequestId,
  requestId,
  sanitizeRequestId,
};
