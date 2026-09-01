import { apiClient } from '../../../lib/api-client.js';
import { buildQueryParams } from '../../../lib/query-params.js';

export const MAINTENANCE_TYPES = ['Corrective', 'Preventive', 'Inspection'];
export const MAINTENANCE_SCHEDULE_TYPES = ['Preventive', 'Inspection'];
export const MAINTENANCE_STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];
export const MAINTENANCE_FREQUENCY_UNITS = ['days', 'weeks', 'months'];
export const ASSET_STATUS_OVERRIDES = ['Available', 'Assigned', 'Under Maintenance', 'Damaged', 'Retired'];

export const DEFAULT_MAINTENANCE_FILTERS = Object.freeze({
  status: '',
  asset_id: '',
  search: '',
});

export const DEFAULT_SCHEDULE_FILTERS = Object.freeze({
  asset_id: '',
  is_active: '',
  search: '',
});

export function buildMaintenanceQuery(filters = {}) {
  return buildQueryParams({
    asset_id: filters.asset_id || '',
    status: filters.status || '',
  });
}

export function buildScheduleQuery(filters = {}) {
  return buildQueryParams({
    asset_id: filters.asset_id || '',
    is_active: filters.is_active || '',
  });
}

export function parseChecklist(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(raw || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getChecklistItems(record = {}) {
  if (!record) return [];
  if (Array.isArray(record.checklist_items)) return record.checklist_items;
  if (Array.isArray(record.checklist_json)) return record.checklist_json;
  if (!record.checklist_json) return [];
  try {
    const parsed = JSON.parse(record.checklist_json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function filterMaintenanceBySearch(records = [], searchTerm = '') {
  const value = String(searchTerm || '').trim().toLowerCase();
  if (!value) return records;

  return records.filter((record) => [
    record.asset_tag,
    record.asset_type,
    record.problem,
    record.action_taken,
    record.notes,
    record.maintenance_type,
    record.status,
    record.technician_name,
  ].filter(Boolean).join(' ').toLowerCase().includes(value));
}

export function filterSchedulesBySearch(schedules = [], searchTerm = '') {
  const value = String(searchTerm || '').trim().toLowerCase();
  if (!value) return schedules;

  return schedules.filter((schedule) => [
    schedule.title,
    schedule.description,
    schedule.asset_tag,
    schedule.asset_type,
    schedule.maintenance_type,
    schedule.frequency_unit,
    schedule.technician_name,
  ].filter(Boolean).join(' ').toLowerCase().includes(value));
}

export function normalizeMaintenancePayload(form = {}) {
  return {
    asset_id: form.asset_id,
    problem: String(form.problem || '').trim(),
    action_taken: String(form.action_taken || '').trim(),
    maintenance_type: form.maintenance_type || 'Corrective',
    maintenance_date: form.maintenance_date || null,
    cost: form.cost || 0,
    status: form.status || 'Scheduled',
    notes: String(form.notes || '').trim(),
    technician_id: form.technician_id || null,
    related_request_id: form.related_request_id || null,
    schedule_id: form.schedule_id || null,
    scheduled_start_at: form.scheduled_start_at || null,
    next_due_at: form.next_due_at || null,
    checklist_items: parseChecklist(form.checklist_items),
    completion_notes: String(form.completion_notes || '').trim() || null,
    asset_status_override: form.asset_status_override || null,
  };
}

export function normalizeSchedulePayload(form = {}) {
  return {
    asset_id: form.asset_id,
    title: String(form.title || '').trim(),
    description: String(form.description || '').trim(),
    maintenance_type: form.maintenance_type || 'Preventive',
    frequency_unit: form.frequency_unit || 'days',
    frequency_value: Number(form.frequency_value || 30),
    next_due_at: form.next_due_at,
    assigned_technician_id: form.assigned_technician_id || null,
    reminder_days_before: Number(form.reminder_days_before ?? 3),
    checklist_items: parseChecklist(form.checklist_items),
    ...(form.is_active === '' || form.is_active === undefined ? {} : { is_active: form.is_active === true || form.is_active === 'true' }),
  };
}

export async function fetchMaintenance(filters = {}) {
  const query = buildMaintenanceQuery(filters).toString();
  const suffix = query ? `?${query}` : '';
  return apiClient(`/maintenance${suffix}`);
}

export async function fetchSchedules(filters = {}) {
  const query = buildScheduleQuery(filters).toString();
  const suffix = query ? `?${query}` : '';
  return apiClient(`/maintenance/schedules${suffix}`);
}

export async function createMaintenance(payload) {
  return apiClient('/maintenance', {
    method: 'POST',
    body: normalizeMaintenancePayload(payload),
  });
}

export async function updateMaintenance(maintenanceId, payload) {
  return apiClient(`/maintenance/${maintenanceId}`, {
    method: 'PUT',
    body: normalizeMaintenancePayload(payload),
  });
}

export async function markMaintenanceComplete(maintenanceId, payload = {}) {
  return apiClient(`/maintenance/${maintenanceId}`, {
    method: 'PUT',
    body: {
      status: 'Completed',
      action_taken: payload.action_taken || null,
      notes: payload.notes || null,
      completion_notes: payload.completion_notes || null,
      asset_status_override: payload.asset_status_override || null,
      checklist_items: Array.isArray(payload.checklist_items) ? payload.checklist_items : undefined,
    },
  });
}

export async function createSchedule(payload) {
  return apiClient('/maintenance/schedules', {
    method: 'POST',
    body: normalizeSchedulePayload(payload),
  });
}

export async function updateSchedule(scheduleId, payload) {
  return apiClient(`/maintenance/schedules/${scheduleId}`, {
    method: 'PUT',
    body: normalizeSchedulePayload(payload),
  });
}

export async function fetchAssetLookup() {
  return apiClient('/assets');
}

export async function fetchStaffLookup() {
  return apiClient('/staff');
}
