import { apiClient, apiDownload } from '../../../lib/api-client.js';
import { buildQueryParams } from '../../../lib/query-params.js';

export const DEFAULT_REPORT_FILTERS = Object.freeze({
  date_from: '',
  date_to: '',
  department_id: '',
  technician_id: '',
  category: '',
  ticket_type: '',
});

export const DEFAULT_REPORT_PAGES = Object.freeze({
  tickets: 1,
  assets: 1,
  maintenance: 1,
});

export const REPORT_PAGE_SIZE = 10;

export function buildReportQuery(filters = {}, pagination = {}) {
  return buildQueryParams({
    date_from: filters.date_from || '',
    date_to: filters.date_to || '',
    department_id: filters.department_id || '',
    technician_id: filters.technician_id || '',
    category: filters.category || '',
    ticket_type: filters.ticket_type || '',
    page: pagination.page || '',
    page_size: pagination.page_size || '',
  });
}

export function normalizeReportRows(data = {}) {
  const pageSize = Number(data.page_size || REPORT_PAGE_SIZE);
  const total = Number(data.total || 0);

  return {
    page: Number(data.page || 1),
    page_size: pageSize,
    total,
    total_pages: Math.max(1, Math.ceil(total / pageSize)),
    rows: Array.isArray(data.rows) ? data.rows : [],
  };
}

export function normalizeReportSummary(data = {}) {
  return {
    filters_applied: data.filters_applied || {},
    assets_by_type: Array.isArray(data.assets_by_type) ? data.assets_by_type : [],
    assets_by_status: Array.isArray(data.assets_by_status) ? data.assets_by_status : [],
    assets_by_department: Array.isArray(data.assets_by_department) ? data.assets_by_department : [],
    requests_by_category: Array.isArray(data.requests_by_category) ? data.requests_by_category : [],
    requests_by_priority: Array.isArray(data.requests_by_priority) ? data.requests_by_priority : [],
    requests_by_status: Array.isArray(data.requests_by_status) ? data.requests_by_status : [],
    monthly_maintenance: Array.isArray(data.monthly_maintenance) ? data.monthly_maintenance : [],
    technician_workload: Array.isArray(data.technician_workload) ? data.technician_workload : [],
    technician_resolutions: Array.isArray(data.technician_resolutions) ? data.technician_resolutions : [],
    department_stats: Array.isArray(data.department_stats) ? data.department_stats : [],
    overdue_tickets: Array.isArray(data.overdue_tickets) ? data.overdue_tickets : [],
    requests_by_assignment: data.requests_by_assignment || {},
    sla_policy_coverage: data.sla_policy_coverage || {},
    maintenance_schedule_health: data.maintenance_schedule_health || {},
    asset_ticket_linkage: data.asset_ticket_linkage || {},
    knowledge_base_analytics: data.knowledge_base_analytics || {},
    sla_performance: data.sla_performance || {},
    scheduled_report_architecture: data.scheduled_report_architecture || {},
  };
}

export async function fetchReportFilters() {
  return apiClient('/reports/filters');
}

export async function fetchReportSummary(filters = {}) {
  const query = buildReportQuery(filters).toString();
  const suffix = query ? `?${query}` : '';
  return normalizeReportSummary(await apiClient(`/reports/summary${suffix}`));
}

export async function fetchReportRows(kind, filters = {}, pagination = {}) {
  const query = buildReportQuery(filters, pagination).toString();
  const suffix = query ? `?${query}` : '';
  return normalizeReportRows(await apiClient(`/reports/${kind}${suffix}`));
}

export async function downloadReportCsv(kind, filters = {}) {
  const query = buildReportQuery(filters).toString();
  const suffix = query ? `?${query}` : '';
  return apiDownload(`/reports/export/${kind}.csv${suffix}`);
}

export function triggerCsvDownload(blob, filename) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
  return true;
}

export function buildResolvedTechnicianRows(workload = [], resolutions = []) {
  return workload.map((row) => {
    const resolved = resolutions.find((candidate) => candidate.technician === row.technician);
    return {
      ...row,
      resolved_count: Number(resolved?.resolved_count || 0),
      open_requests: Number(row.open_requests || 0),
    };
  });
}

export function formatRatio(numerator, denominator) {
  const top = Number(numerator || 0);
  const bottom = Number(denominator || 0);
  if (!bottom) return '0%';
  return `${Math.round((top / bottom) * 100)}%`;
}
