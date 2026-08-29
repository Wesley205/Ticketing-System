const pool = require('../../config/db');
const repository = require('./report.repository');
const mapper = require('./report.mapper');
const {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} = require('./report.constants');

function parsePositiveInt(value, fallback = null) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseDateValue(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseReportFilters(query = {}) {
  const dateFrom = parseDateValue(query.date_from);
  const dateTo = parseDateValue(query.date_to);
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error('date_from cannot be after date_to.');
  }

  const page = parsePositiveInt(query.page, 1);
  const pageSize = Math.min(parsePositiveInt(query.page_size, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

  return {
    date_from: dateFrom,
    date_to: dateTo,
    department_id: parsePositiveInt(query.department_id),
    technician_id: parsePositiveInt(query.technician_id),
    category: query.category ? String(query.category) : null,
    ticket_type: query.ticket_type ? String(query.ticket_type) : null,
    page,
    page_size: pageSize,
    offset: (page - 1) * pageSize,
  };
}

function applyDateRange({ clauses, params, column, date_from, date_to }) {
  if (date_from) {
    params.push(date_from);
    clauses.push(`${column} >= $${params.length}`);
  }
  if (date_to) {
    params.push(addDays(date_to, 1));
    clauses.push(`${column} < $${params.length}`);
  }
}

function applyTicketFilters(filters, { clauses, params, alias = 'sr', dateColumn = 'sr.date_submitted' }) {
  applyDateRange({ clauses, params, column: dateColumn, date_from: filters.date_from, date_to: filters.date_to });

  if (filters.department_id) {
    params.push(filters.department_id);
    clauses.push(`${alias}.department_id = $${params.length}`);
  }
  if (filters.technician_id) {
    params.push(filters.technician_id);
    clauses.push(`${alias}.assigned_technician_id = $${params.length}`);
  }
  if (filters.category) {
    params.push(filters.category);
    clauses.push(`${alias}.category = $${params.length}`);
  }
  if (filters.ticket_type) {
    params.push(filters.ticket_type);
    clauses.push(`${alias}.ticket_type = $${params.length}`);
  }
}

function applyAssetFilters(filters, { clauses, params, alias = 'a', dateColumn = 'a.date_added' }) {
  applyDateRange({ clauses, params, column: dateColumn, date_from: filters.date_from, date_to: filters.date_to });
  if (filters.department_id) {
    params.push(filters.department_id);
    clauses.push(`${alias}.department_id = $${params.length}`);
  }
}

function applyMaintenanceFilters(filters, { clauses, params, maintenanceAlias = 'm', assetAlias = 'a', dateColumn = 'm.maintenance_date' }) {
  applyDateRange({ clauses, params, column: dateColumn, date_from: filters.date_from, date_to: filters.date_to });
  if (filters.department_id) {
    params.push(filters.department_id);
    clauses.push(`${assetAlias}.department_id = $${params.length}`);
  }
  if (filters.technician_id) {
    params.push(filters.technician_id);
    clauses.push(`${maintenanceAlias}.technician_id = $${params.length}`);
  }
}

function buildWhereClause(clauses) {
  return clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
}

function addPagination(params, filters) {
  params.push(filters.page_size);
  const limitParam = params.length;
  params.push(filters.offset);
  const offsetParam = params.length;
  return { limitParam, offsetParam };
}

function buildReportScopes(filters) {
  const ticketClauses = [];
  const ticketParams = [];
  applyTicketFilters(filters, { clauses: ticketClauses, params: ticketParams, alias: 'sr' });

  const assetClauses = [];
  const assetParams = [];
  applyAssetFilters(filters, { clauses: assetClauses, params: assetParams, alias: 'a' });

  const maintenanceClauses = [];
  const maintenanceParams = [];
  applyMaintenanceFilters(filters, { clauses: maintenanceClauses, params: maintenanceParams, maintenanceAlias: 'm', assetAlias: 'a' });

  return {
    ticket: { where: buildWhereClause(ticketClauses), params: ticketParams },
    asset: { where: buildWhereClause(assetClauses), params: assetParams },
    maintenance: { where: buildWhereClause(maintenanceClauses), params: maintenanceParams },
  };
}

function buildScheduledReportArchitecture() {
  return {
    version: 1,
    stages: [
      'validated_filter_snapshot',
      'scoped_query_execution',
      'render_to_json_or_csv',
      'persist_export_metadata',
      'deliver_via_notification_channel',
    ],
    future_tables: [
      'scheduled_reports',
      'scheduled_report_runs',
      'scheduled_report_recipients',
    ],
  };
}

async function getReportFilters(executor = pool) {
  return repository.getReportFilters(executor);
}

async function getReportSummary(rawQuery = {}, executor = pool) {
  const filters = parseReportFilters(rawQuery);
  const scopes = buildReportScopes(filters);
  const rows = await repository.getReportSummary(executor, filters, scopes);
  return mapper.mapSummary(filters, rows, buildScheduledReportArchitecture());
}

async function getTicketReportRows(rawQuery = {}, executor = pool) {
  const filters = parseReportFilters(rawQuery);
  const scope = buildReportScopes(filters).ticket;
  const result = await repository.getTicketReportRows(executor, filters, scope, addPagination);
  return mapper.mapReportRows(filters, result.rows, result.total);
}

async function getAssetReportRows(rawQuery = {}, executor = pool) {
  const filters = parseReportFilters(rawQuery);
  const scope = buildReportScopes(filters).asset;
  const result = await repository.getAssetReportRows(executor, filters, scope, addPagination);
  return mapper.mapReportRows(filters, result.rows, result.total);
}

async function getMaintenanceReportRows(rawQuery = {}, executor = pool) {
  const filters = parseReportFilters(rawQuery);
  const scope = buildReportScopes(filters).maintenance;
  const result = await repository.getMaintenanceReportRows(executor, filters, scope, addPagination);
  return mapper.mapReportRows(filters, result.rows, result.total);
}

async function exportAssetsCsv(rawQuery = {}, executor = pool) {
  const filters = parseReportFilters(rawQuery);
  const rows = await repository.getAssetCsvRows(executor, buildReportScopes(filters).asset);
  const headers = ['Asset Tag', 'Type', 'Brand', 'Model', 'Serial Number', 'Department', 'Assigned Staff', 'Status', 'Condition', 'Location', 'Purchase Date'];
  const values = rows.map((row) => [
    row.asset_tag, row.asset_type, row.brand, row.model, row.serial_number,
    row.department, row.assigned_staff, row.status, row.condition, row.location, row.purchase_date,
  ]);
  return mapper.toCsv(headers, values);
}

async function exportServiceRequestsCsv(rawQuery = {}, executor = pool) {
  const filters = parseReportFilters(rawQuery);
  const rows = await repository.getServiceRequestCsvRows(executor, buildReportScopes(filters).ticket);
  const headers = ['Request ID', 'Ticket Number', 'Requester', 'Department', 'Category', 'Ticket Type', 'Subject', 'Priority', 'Status', 'Technician', 'Assignment Notes', 'Expected Completion', 'Response Due', 'Resolution Due', 'Escalation Count', 'Date Submitted', 'Date Resolved'];
  const values = rows.map((row) => [
    row.request_id, row.ticket_number, row.requester, row.department, row.category, row.ticket_type, row.subject,
    row.priority, row.status, row.technician, row.assignment_notes, row.expected_completion_at,
    row.sla_response_due_at, row.sla_resolution_due_at, row.escalation_count, row.date_submitted, row.date_resolved,
  ]);
  return mapper.toCsv(headers, values);
}

module.exports = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  addPagination,
  applyAssetFilters,
  applyMaintenanceFilters,
  applyTicketFilters,
  buildReportScopes,
  buildScheduledReportArchitecture,
  buildWhereClause,
  exportAssetsCsv,
  exportServiceRequestsCsv,
  getAssetReportRows,
  getMaintenanceReportRows,
  getReportFilters,
  getReportSummary,
  getTicketReportRows,
  parseReportFilters,
};
