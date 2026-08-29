function getRequestId(req) {
  return req?.requestId || null;
}

function sendSuccess(res, data = {}, { req, statusCode = 200, meta = {} } = {}) {
  return res.status(statusCode).json({
    success: true,
    data,
    meta: {
      request_id: getRequestId(req),
      ...meta,
    },
  });
}

function buildErrorPayload(req, error, { includeStack = false } = {}) {
  const payload = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: Array.isArray(error.details) ? error.details : [],
    },
    meta: {
      request_id: getRequestId(req),
    },
  };

  if (includeStack && error.stack) {
    payload.error.stack = error.stack;
  }

  return payload;
}

function sendError(res, req, error, options = {}) {
  return res
    .status(error.statusCode || error.status || 500)
    .json(buildErrorPayload(req, error, options));
}

module.exports = {
  buildErrorPayload,
  getRequestId,
  sendError,
  sendSuccess,
};
