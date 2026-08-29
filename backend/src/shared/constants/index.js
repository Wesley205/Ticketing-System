const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 120;

const SORT_DIRECTIONS = Object.freeze({
  ASC: 'ASC',
  DESC: 'DESC',
});

const COMMON_QUERY_KEYS = Object.freeze([
  'page',
  'page_size',
  'sort',
  'search',
]);

module.exports = {
  COMMON_QUERY_KEYS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  SORT_DIRECTIONS,
  ...require('./domain'),
};
