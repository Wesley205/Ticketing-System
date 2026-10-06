import { apiClient } from '../../../lib/api-client.js';
import { buildQueryParams } from '../../../lib/query-params.js';

export const DEFAULT_DASHBOARD_FILTERS = Object.freeze({
  date_from: '',
  date_to: '',
  department_id: '',
  technician_id: '',
  category: '',
  ticket_type: '',
});

export const FALLBACK_TICKET_CATEGORIES = [
  'Computer',
  'Network',
  'Printer',
  'Internet',
  'Software',
  'Email',
  'Hardware',
  'Other',
];

export const FALLBACK_TICKET_TYPES = [
  'Incident',
  'Service Request',
  'Access Request',
  'Maintenance Request',
  'Change Request',
];

export function buildDashboardStatsQuery(filters = {}) {
  return buildQueryParams({
    date_from: filters.date_from || '',
    date_to: filters.date_to || '',
    department_id: filters.department_id || '',
    technician_id: filters.technician_id || '',
    category: filters.category || '',
    ticket_type: filters.ticket_type || '',
  });
}

export function normalizeDashboardStats(data = {}) {
  return {
    filters_applied: data.filters_applied || {},
    total_requests: Number(data.total_requests || 0),
    pending_requests: Number(data.pending_requests || 0),
    in_progress_requests: Number(data.in_progress_requests || 0),
    resolved_requests: Number(data.resolved_requests || 0),
    overdue_requests: Number(data.overdue_requests || 0),
    escalated_requests: Number(data.escalated_requests || 0),
    response_sla_met: Number(data.response_sla_met || 0),
    response_sla_measured: Number(data.response_sla_measured || 0),
    resolution_sla_met: Number(data.resolution_sla_met || 0),
    resolution_sla_measured: Number(data.resolution_sla_measured || 0),
    response_sla_met_rate: data.response_sla_met_rate === null ? null : Number(data.response_sla_met_rate || 0),
    resolution_sla_met_rate: data.resolution_sla_met_rate === null ? null : Number(data.resolution_sla_met_rate || 0),
    avg_resolution_hours: data.avg_resolution_hours === null ? null : Number(data.avg_resolution_hours || 0),
    total_assets: Number(data.total_assets || 0),
    active_assets: Number(data.active_assets || 0),
    available_assets: Number(data.available_assets || 0),
    assigned_assets: Number(data.assigned_assets || 0),
    maintenance_assets: Number(data.maintenance_assets || 0),
    damaged_assets: Number(data.damaged_assets || 0),
    retired_assets: Number(data.retired_assets || 0),
    due_maintenance_schedules: Number(data.due_maintenance_schedules || 0),
    maintenance_total_cost: Number(data.maintenance_total_cost || 0),
    maintenance_total_records: Number(data.maintenance_total_records || 0),
    maintenance_completed_records: Number(data.maintenance_completed_records || 0),
    tickets_by_status: Array.isArray(data.tickets_by_status) ? data.tickets_by_status : [],
    tickets_by_priority: Array.isArray(data.tickets_by_priority) ? data.tickets_by_priority : [],
    assets_by_status: Array.isArray(data.assets_by_status) ? data.assets_by_status : [],
    technician_workload: Array.isArray(data.technician_workload) ? data.technician_workload : [],
  };
}

export async function fetchDashboardStats(filters = {}) {
  const query = buildDashboardStatsQuery(filters).toString();
  const suffix = query ? `?${query}` : '';
  const data = await apiClient(`/dashboard/stats${suffix}`);
  return normalizeDashboardStats(data);
}

export async function fetchDashboardFilterOptions() {
  return apiClient('/reports/filters');
}

export function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return `${Math.round(Number(value) * 100)}%`;
}

export function formatHours(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return Number(value).toFixed(1);
}

export function getDashboardScope(profile = {}) {
  const scope = profile.scope || {};
  if (scope.organization_scope || scope.organizationScope) return 'Organization scope';
  if (scope.assigned_only || scope.assignedOnly) return 'Assigned-only scope';
  if (scope.department_scope || scope.departmentScope) return 'Department scope';
  return 'Self-service scope';
}

export function getDashboardHeading(profile = {}) {
  return {
    administrator: 'Administrator command view',
    ict_officer: 'ICT operations command view',
    technician: 'Technician workload view',
    department_supervisor: 'Department service view',
    staff: 'Self-service workspace',
  }[profile.primary_portal] || 'Operational workspace';
}

export function dashboardRole(user = {}, profile = {}) {
  const role = profile.role || user.role;
  if (role === 'admin') return 'admin';
  if (role === 'ict_officer') return 'ict_officer';
  if (role === 'technician') return 'technician';
  return 'staff';
}

