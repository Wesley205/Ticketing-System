const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('./constants');
const { parseInteger } = require('../validation');

function parsePagination(query = {}, {
  defaultPage = 1,
  defaultPageSize = DEFAULT_PAGE_SIZE,
  maxPageSize = MAX_PAGE_SIZE,
} = {}) {
  const page = parseInteger(query.page ?? defaultPage, {
    field: 'page',
    min: 1,
  });

  const pageSize = parseInteger(query.page_size ?? defaultPageSize, {
    field: 'page_size',
    min: 1,
    max: maxPageSize,
  });

  return {
    page,
    page_size: pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}

function buildPagination({ page, page_size, total }) {
  const safeTotal = Number.isSafeInteger(Number(total)) && Number(total) >= 0
    ? Number(total)
    : 0;

  return {
    page,
    page_size,
    total: safeTotal,
    total_pages: safeTotal === 0 ? 0 : Math.ceil(safeTotal / page_size),
  };
}

function buildPaginatedData(rows, pagination, total) {
  return {
    data: Array.isArray(rows) ? rows : [],
    pagination: buildPagination({ ...pagination, total }),
  };
}

module.exports = {
  buildPaginatedData,
  buildPagination,
  parsePagination,
};
