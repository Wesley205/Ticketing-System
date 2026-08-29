const { COMMON_QUERY_KEYS, SORT_DIRECTIONS } = require('./constants');
const {
  createValidationError,
  fieldDetail,
  parseEnum,
  parseIntegerId,
  parseIsoDate,
  parseSafeString,
  validateAllowedQueryKeys,
  validateDateRange,
} = require('../validation');
const { parsePagination } = require('./pagination');

function parseSort(sortValue, allowlist, { defaultSort = null } = {}) {
  const raw = parseSafeString(sortValue || defaultSort, {
    field: 'sort',
    required: Boolean(defaultSort),
    maxLength: 80,
  });

  if (!raw) return null;

  const direction = raw.startsWith('-') ? SORT_DIRECTIONS.DESC : SORT_DIRECTIONS.ASC;
  const field = raw.replace(/^-/, '');

  if (!Object.prototype.hasOwnProperty.call(allowlist, field)) {
    throw createValidationError('The request contains invalid data.', [
      fieldDetail('sort', `sort must be one of: ${Object.keys(allowlist).join(', ')}.`),
    ]);
  }

  return {
    field,
    direction,
    sql: `${allowlist[field]} ${direction}`,
  };
}

function parseSearch(value, options = {}) {
  return parseSafeString(value, {
    field: options.field || 'search',
    required: false,
    maxLength: options.maxLength,
  });
}

function parseCommonListQuery(query = {}, {
  allowedQueryKeys = [],
  sortAllowlist = {},
  defaultSort = null,
  maxPageSize,
} = {}) {
  validateAllowedQueryKeys(query, [...COMMON_QUERY_KEYS, ...allowedQueryKeys]);

  return {
    ...parsePagination(query, { maxPageSize }),
    search: parseSearch(query.search),
    sort: parseSort(query.sort, sortAllowlist, { defaultSort }),
  };
}

function parseDateRangeFilters(query = {}) {
  const date_from = parseIsoDate(query.date_from, { field: 'date_from' });
  const date_to = parseIsoDate(query.date_to, { field: 'date_to' });
  validateDateRange({ date_from, date_to });

  return { date_from, date_to };
}

function parseIdFilters(query = {}, fields = []) {
  return fields.reduce((filters, field) => {
    filters[field] = parseIntegerId(query[field], field, { required: false });
    return filters;
  }, {});
}

function parseEnumFilters(query = {}, enumMap = {}) {
  return Object.entries(enumMap).reduce((filters, [field, allowedValues]) => {
    filters[field] = parseEnum(query[field], allowedValues, { field, required: false });
    return filters;
  }, {});
}

module.exports = {
  parseCommonListQuery,
  parseDateRangeFilters,
  parseEnumFilters,
  parseIdFilters,
  parseSearch,
  parseSort,
};
