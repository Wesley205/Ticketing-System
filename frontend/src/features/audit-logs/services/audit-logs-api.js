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
