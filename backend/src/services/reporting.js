const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

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

module.exports = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  addPagination,
  applyAssetFilters,
  applyMaintenanceFilters,
  applyTicketFilters,
  buildScheduledReportArchitecture,
  buildWhereClause,
  parseReportFilters,
};
