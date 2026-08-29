const test = require('node:test');
const assert = require('node:assert/strict');

const { buildPaginatedData, buildPagination, parsePagination } = require('../src/shared/pagination');
const {
  parseCommonListQuery,
  parseDateRangeFilters,
  parseEnumFilters,
  parseIdFilters,
  parseSearch,
  parseSort,
} = require('../src/shared/queryFilters');
const {
  parseEnum,
  parseIntegerId,
  parseIsoDate,
  parseSafeString,
  validateAllowedQueryKeys,
} = require('../src/validation');

test('parsePagination returns page, page size, limit, and offset', () => {
  const pagination = parsePagination({ page: '3', page_size: '25' });

  assert.deepEqual(pagination, {
    page: 3,
    page_size: 25,
    limit: 25,
    offset: 50,
  });
});

test('parsePagination rejects invalid and excessive values', () => {
  assert.throws(() => parsePagination({ page: '0' }), (err) =>
    err.code === 'VALIDATION_ERROR' && err.details[0].field === 'page'
  );
  assert.throws(() => parsePagination({ page_size: '101' }), (err) =>
    err.code === 'VALIDATION_ERROR' && err.details[0].field === 'page_size'
  );
});

test('buildPagination and buildPaginatedData emit the standard list contract shape', () => {
  assert.deepEqual(buildPagination({ page: 2, page_size: 25, total: 51 }), {
    page: 2,
    page_size: 25,
    total: 51,
    total_pages: 3,
  });

  assert.deepEqual(buildPaginatedData([{ id: 1 }], { page: 1, page_size: 25 }, 1), {
    data: [{ id: 1 }],
    pagination: {
      page: 1,
      page_size: 25,
      total: 1,
      total_pages: 1,
    },
  });
});

test('validation helpers parse IDs, dates, enums, and safe strings', () => {
  const date = parseIsoDate('2026-08-28', { field: 'date_from' });

  assert.equal(parseIntegerId('42', 'department_id'), 42);
  assert.equal(date.toISOString().slice(0, 10), '2026-08-28');
  assert.equal(parseEnum('Incident', ['Incident', 'Service Request'], { field: 'ticket_type' }), 'Incident');
  assert.equal(parseSafeString('  network issue  ', { field: 'search' }), 'network issue');
  assert.equal(parseSearch('printer'), 'printer');
});

test('validation helpers reject invalid dates, enums, arrays, and unsafe query values', () => {
  assert.throws(() => parseIsoDate('2026-02-30', { field: 'date_from' }), (err) =>
    err.code === 'VALIDATION_ERROR' && err.details[0].field === 'date_from'
  );
  assert.throws(() => parseEnum('Bad', ['Good'], { field: 'status' }), (err) =>
    err.code === 'VALIDATION_ERROR' && err.details[0].field === 'status'
  );
  assert.throws(() => parseIntegerId(['1', '2'], 'asset_id'), (err) =>
    err.code === 'VALIDATION_ERROR' && err.details[0].field === 'asset_id'
  );
  assert.throws(() => parseSafeString('bad\u0000value', { field: 'search' }), (err) =>
    err.code === 'VALIDATION_ERROR' && err.details[0].field === 'search'
  );
});

test('validateAllowedQueryKeys rejects unknown query fields', () => {
  assert.throws(() => validateAllowedQueryKeys({ page: '1', unsafe: 'x' }, ['page']), (err) =>
    err.code === 'VALIDATION_ERROR' && err.details[0].field === 'unsafe'
  );
});

test('parseSort accepts allowlisted fields and rejects unknown sort columns', () => {
  assert.deepEqual(parseSort('-created_at', { created_at: 'sr.date_submitted' }), {
    field: 'created_at',
    direction: 'DESC',
    sql: 'sr.date_submitted DESC',
  });

  assert.throws(() => parseSort('password_hash', { created_at: 'sr.date_submitted' }), (err) =>
    err.code === 'VALIDATION_ERROR' && err.details[0].field === 'sort'
  );
});

test('parseCommonListQuery combines pagination, search, and safe sorting', () => {
  const parsed = parseCommonListQuery(
    { page: '2', page_size: '10', search: 'vpn', sort: 'subject', status: 'Open' },
    {
      allowedQueryKeys: ['status'],
      sortAllowlist: { subject: 'sr.subject' },
    },
  );

  assert.equal(parsed.page, 2);
  assert.equal(parsed.offset, 10);
  assert.equal(parsed.search, 'vpn');
  assert.equal(parsed.sort.sql, 'sr.subject ASC');
});

test('filter helpers parse date ranges, IDs, and enum filters', () => {
  const dates = parseDateRangeFilters({ date_from: '2026-08-01', date_to: '2026-08-28' });
  const ids = parseIdFilters({ department_id: '5', technician_id: '7' }, ['department_id', 'technician_id']);
  const enums = parseEnumFilters({ status: 'Open' }, { status: ['Open', 'Closed'] });

  assert.equal(dates.date_from.toISOString().slice(0, 10), '2026-08-01');
  assert.deepEqual(ids, { department_id: 5, technician_id: 7 });
  assert.deepEqual(enums, { status: 'Open' });
  assert.throws(() => parseDateRangeFilters({ date_from: '2026-09-01', date_to: '2026-08-01' }), (err) =>
    err.code === 'VALIDATION_ERROR' && err.details[0].field === 'date_from'
  );
});
