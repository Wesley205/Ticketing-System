const DB_ERROR_CODES = {
  DUPLICATE_KEY: '23505',
  FOREIGN_KEY: '23503',
  NOT_NULL: '23502',
  CHECK_VIOLATION: '23514',
};

function mapDatabaseError(err = {}) {
  if (err.code === DB_ERROR_CODES.DUPLICATE_KEY) {
    return {
      code: 'DUPLICATE_RESOURCE',
      statusCode: 409,
      message: 'A resource with the same unique value already exists.',
      isOperational: true,
    };
  }

  if (err.code === DB_ERROR_CODES.FOREIGN_KEY) {
    return {
      code: 'FOREIGN_KEY_VIOLATION',
      statusCode: 409,
      message: 'The request references a related resource that does not exist.',
      isOperational: true,
    };
  }

  if (err.code === DB_ERROR_CODES.NOT_NULL || err.code === DB_ERROR_CODES.CHECK_VIOLATION) {
    return {
      code: 'DATABASE_CONSTRAINT_VIOLATION',
      statusCode: 400,
      message: 'The request violates a database constraint.',
      isOperational: true,
    };
  }

  if (err.code && /^[0-9A-Z]{5}$/.test(String(err.code))) {
    return {
      code: 'DATABASE_ERROR',
      statusCode: 500,
      message: 'A database error occurred.',
      isOperational: true,
    };
  }

  return null;
}

module.exports = {
  DB_ERROR_CODES,
  mapDatabaseError,
};
