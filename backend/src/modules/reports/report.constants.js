const {
  TICKET_TYPES,
} = require('../../shared/constants/domain');

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

const TICKET_CATEGORIES = Object.freeze([
  'Computer',
  'Network',
  'Printer',
  'Internet',
  'Software',
  'Email',
  'Hardware',
  'Other',
]);

const REPORT_ERROR_MESSAGES = {
  assetCsvFailed: 'Failed to export assets CSV.',
  assetRowsFailed: 'Failed to load asset report rows.',
  filtersFailed: 'Failed to load report filters.',
  forbidden: 'You do not have permission to view reports.',
  invalidDateRange: 'date_from cannot be after date_to.',
  maintenanceRowsFailed: 'Failed to load maintenance report rows.',
  requestCsvFailed: 'Failed to export request CSV.',
  summaryFailed: 'Failed to generate report summary.',
  ticketRowsFailed: 'Failed to load ticket report rows.',
};

module.exports = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  REPORT_ERROR_MESSAGES,
  TICKET_CATEGORIES,
  TICKET_TYPES,
};
