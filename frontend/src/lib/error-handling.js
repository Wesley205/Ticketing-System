export function normalizeErrorMessage(input, fallback = 'Something went wrong.') {
  if (!input) return fallback;
  if (typeof input === 'string') return input;
  if (input instanceof Error && input.message) return input.message;
  if (typeof input === 'object') {
    if (typeof input.error === 'string') return input.error;
    if (typeof input.message === 'string') return input.message;
    if (Array.isArray(input.details) && input.details.length) {
      return input.details.map((detail) => String(detail)).join(', ');
    }
  }

  return fallback;
}

export function normalizeApiError(error, fallback = 'Request failed.') {
  const message = normalizeErrorMessage(error?.payload || error, fallback);

  return {
    name: error?.name || 'ApiError',
    message,
    status: error?.status || error?.statusCode || 500,
    code: error?.code || error?.payload?.code || 'REQUEST_FAILED',
    details: Array.isArray(error?.payload?.details) ? error.payload.details : [],
    payload: error?.payload || null,
  };
}

export function createHttpError({ message, status = 500, code = 'REQUEST_FAILED', payload = null } = {}) {
  const error = new Error(message || 'Request failed.');
  error.name = 'ApiError';
  error.status = status;
  error.code = code;
  error.payload = payload;
  return error;
}
