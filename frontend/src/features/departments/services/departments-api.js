import { apiClient } from '../../../lib/api-client.js';

export function normalizeDepartmentRow(row = {}) {
  return {
    ...row,
    staff_count: Number(row.staff_count || 0),
    asset_count: Number(row.asset_count || 0),
    request_count: Number(row.request_count || 0),
  };
}

export function normalizeDepartmentDetail(detail = {}) {
  return {
    ...detail,
    staff: Array.isArray(detail.staff) ? detail.staff : [],
    assets: Array.isArray(detail.assets) ? detail.assets : [],
    service_requests: Array.isArray(detail.service_requests) ? detail.service_requests : [],
  };
}

export function filterDepartmentsBySearch(departments = [], searchTerm = '') {
  const value = String(searchTerm || '').trim().toLowerCase();
  if (!value) return departments;

  return departments.filter((department) => [
    department.name,
    department.description,
    department.staff_count,
    department.asset_count,
    department.request_count,
  ].filter((item) => item !== undefined && item !== null).join(' ').toLowerCase().includes(value));
}

export function normalizeDepartmentPayload(form = {}) {
  return {
    name: String(form.name || '').trim(),
    description: String(form.description || '').trim(),
  };
}

export async function fetchDepartments() {
  const rows = await apiClient('/departments');
  return Array.isArray(rows) ? rows.map(normalizeDepartmentRow) : [];
}

export async function fetchDepartmentDetail(departmentId) {
  return normalizeDepartmentDetail(await apiClient(`/departments/${departmentId}`));
}

export async function createDepartment(payload) {
  return normalizeDepartmentRow(await apiClient('/departments', {
    method: 'POST',
    body: normalizeDepartmentPayload(payload),
  }));
}

export async function updateDepartment(departmentId, payload) {
  return normalizeDepartmentRow(await apiClient(`/departments/${departmentId}`, {
    method: 'PUT',
    body: normalizeDepartmentPayload(payload),
  }));
}
