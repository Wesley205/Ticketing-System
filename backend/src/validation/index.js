const AppError = require('../errors/AppError');
const { ERROR_CODES } = require('../errors/errorCodes');
const { MAX_SEARCH_LENGTH } = require('../shared/constants');

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const INTEGER_PATTERN = /^-?\d+$/;
const UNSAFE_TEXT_PATTERN = /[\u0000-\u001F\u007F]/;

function isEmpty(value) {
  return value === undefined || value === null || value === '';
}

function createValidationError(message, details = []) {
  return new AppError({
    code: ERROR_CODES.VALIDATION_ERROR,
    statusCode: 400,
    message,
    details,
  });
}

function fieldDetail(field, message) {
  return { field, message };
}

function rejectArray(value, field) {
  if (Array.isArray(value)) {
    throw createValidationError('The request contains invalid data.', [
      fieldDetail(field, `${field} must be provided only once.`),
    ]);
  }
}

function parseInteger(value, {
  field = 'value',
  required = false,
  min = Number.MIN_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
} = {}) {
  if (isEmpty(value)) {
    if (!required) return null;
    throw createValidationError('The request contains invalid data.', [
      fieldDetail(field, `${field} is required.`),
    ]);
  }

  rejectArray(value, field);
  const raw = String(value).trim();

  if (!INTEGER_PATTERN.test(raw)) {
    throw createValidationError('The request contains invalid data.', [
      fieldDetail(field, `${field} must be an integer.`),
    ]);
  }

  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw createValidationError('The request contains invalid data.', [
      fieldDetail(field, `${field} is outside the allowed range.`),
    ]);
  }

  return parsed;
}

function parseIntegerId(value, field = 'id', options = {}) {
  return parseInteger(value, {
    field,
    required: options.required !== false,
    min: 1,
    max: options.max || Number.MAX_SAFE_INTEGER,
  });
}

function parseBoolean(value, { field = 'value', required = false } = {}) {
  if (isEmpty(value)) {
    if (!required) return null;
    throw createValidationError('The request contains invalid data.', [
      fieldDetail(field, `${field} is required.`),
    ]);
  }

  rejectArray(value, field);
  const normalized = String(value).trim().toLowerCase();

  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;

  throw createValidationError('The request contains invalid data.', [
    fieldDetail(field, `${field} must be a boolean.`),
  ]);
}

function parseIsoDate(value, { field = 'date', required = false } = {}) {
  if (isEmpty(value)) {
    if (!required) return null;
    throw createValidationError('The request contains invalid data.', [
      fieldDetail(field, `${field} is required.`),
    ]);
  }

  rejectArray(value, field);
  const raw = String(value).trim();

  if (!ISO_DATE_PATTERN.test(raw)) {
    throw createValidationError('The request contains invalid data.', [
      fieldDetail(field, `${field} must use YYYY-MM-DD format.`),
    ]);
  }

  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) {
    throw createValidationError('The request contains invalid data.', [
      fieldDetail(field, `${field} must be a valid calendar date.`),
    ]);
  }

  return parsed;
}

function parseEnum(value, allowedValues, { field = 'value', required = false } = {}) {
  if (isEmpty(value)) {
    if (!required) return null;
    throw createValidationError('The request contains invalid data.', [
      fieldDetail(field, `${field} is required.`),
    ]);
  }

  rejectArray(value, field);
  const raw = String(value).trim();

  if (!allowedValues.includes(raw)) {
    throw createValidationError('The request contains invalid data.', [
      fieldDetail(field, `${field} must be one of: ${allowedValues.join(', ')}.`),
    ]);
  }

  return raw;
}

function parseSafeString(value, {
  field = 'value',
  required = false,
  maxLength = MAX_SEARCH_LENGTH,
  allowEmpty = false,
} = {}) {
  if (isEmpty(value)) {
    if (!required) return null;
    throw createValidationError('The request contains invalid data.', [
      fieldDetail(field, `${field} is required.`),
    ]);
  }

  rejectArray(value, field);
  const raw = String(value).trim();

  if (!allowEmpty && raw.length === 0) {
    if (!required) return null;
    throw createValidationError('The request contains invalid data.', [
      fieldDetail(field, `${field} cannot be empty.`),
    ]);
  }

  if (raw.length > maxLength || UNSAFE_TEXT_PATTERN.test(raw)) {
    throw createValidationError('The request contains invalid data.', [
      fieldDetail(field, `${field} contains an unsafe or unsupported value.`),
    ]);
  }

  return raw;
}

function validateDateRange({ date_from, date_to }) {
  if (date_from && date_to && date_from > date_to) {
    throw createValidationError('The request contains invalid data.', [
      fieldDetail('date_from', 'date_from cannot be after date_to.'),
    ]);
  }
}

function validateAllowedQueryKeys(query = {}, allowedKeys = []) {
  const allowed = new Set(allowedKeys);
  const unexpected = Object.keys(query).filter((key) => !allowed.has(key));

  if (unexpected.length > 0) {
    throw createValidationError('The request contains invalid data.', unexpected.map((field) =>
      fieldDetail(field, `${field} is not a supported query parameter.`)
    ));
  }
}

module.exports = {
  createValidationError,
  fieldDetail,
  parseBoolean,
  parseEnum,
  parseInteger,
  parseIntegerId,
  parseIsoDate,
  parseSafeString,
  validateAllowedQueryKeys,
  validateDateRange,
};
