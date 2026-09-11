import { apiClient } from '../../../lib/api-client.js';
import { buildQueryParams } from '../../../lib/query-params.js';

export const DEFAULT_AUDIT_FILTERS = Object.freeze({
  action: '',
  user_id: '',
  from: '',
  to: '',
  limit: '100',
});

export function buildAuditLogQuery(filters = {}) {
  return buildQueryParams({
    action: filters.action || '',
    user_id: filters.user_id || '',
    from: filters.from || '',
    to: filters.to || '',
    limit: filters.limit || '',
  });
}

export function normalizeAuditLogRow(row = {}) {
  return {
    ...row,
    log_id: Number(row.log_id || 0),
    user_name: row.user_name || 'System',
    user_role: row.user_role || '-',
    record_type: row.record_type || '-',
    record_id: row.record_id || null,
    details: row.details || '-',
  };
}

export async function fetchAuditLogs(filters = {}) {
  const query = buildAuditLogQuery(filters).toString();
  const suffix = query ? `?${query}` : '';
  const rows = await apiClient(`/audit-logs${suffix}`);
  return Array.isArray(rows) ? rows.map(normalizeAuditLogRow) : [];
}

function escapeCsvCell(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildAuditLogCsv(rows = []) {
  const headers = ['Time', 'Actor', 'Role', 'Action', 'Entity', 'Details', 'IP'];
  const body = rows.map((row) => [
    row.created_at,
    row.user_name,
    row.user_role,
    row.action,
    `${row.record_type || '-'}${row.record_id ? ` #${row.record_id}` : ''}`,
    row.details,
    row.ip_address || row.ip || '-',
  ]);

  return [headers, ...body]
    .map((cells) => cells.map(escapeCsvCell).join(','))
    .join('\n');
}

export function downloadAuditLogCsv(rows = [], filename = 'audit-log-report.csv') {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const blob = new Blob([buildAuditLogCsv(rows)], { type: 'text/csv;charset=utf-8' });
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
