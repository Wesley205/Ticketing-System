import { apiClient } from '../../../lib/api-client.js';
import { buildQueryParams } from '../../../lib/query-params.js';

export const USER_ROLES = ['staff', 'technician', 'ict_officer', 'admin'];
export const USER_TYPES = ['employee', 'intern', 'corper', 'contractor', 'guest'];
export const INVITATION_STATUSES = ['pending', 'accepted', 'revoked', 'expired'];

export function buildStaffListQuery(filters = {}) {
  return buildQueryParams({
    search: filters.search || '',
    role: filters.role || '',
    user_type: filters.user_type || '',
    department_id: filters.department_id || '',
  });
}

export function buildInvitationListQuery(filters = {}) {
  return buildQueryParams({
    status: filters.status || '',
  });
}

export function filterStaffBySearch(rows = [], searchTerm = '') {
  const value = String(searchTerm || '').trim().toLowerCase();
  if (!value) return rows;

  return rows.filter((row) => {
    const haystack = [
      row.full_name,
      row.email,
      row.username,
      row.department_name,
      row.role,
      row.user_type,
      row.account_status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(value);
  });
}

export function paginateStaff(rows = [], page = 1, pageSize = 10) {
  const safePageSize = Math.max(1, Number(pageSize) || 10);
  const safePage = Math.max(1, Number(page) || 1);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const currentPage = Math.min(safePage, totalPages);
  const start = (currentPage - 1) * safePageSize;

  return {
    page: currentPage,
    pageSize: safePageSize,
    total,
    totalPages,
    items: rows.slice(start, start + safePageSize),
  };
}

export async function fetchStaff(filters = {}) {
  const query = buildStaffListQuery(filters).toString();
  const suffix = query ? `?${query}` : '';
  return apiClient(`/staff${suffix}`);
}

export async function createStaff(payload) {
  return apiClient('/staff', {
    method: 'POST',
    body: payload,
  });
}

export async function updateStaff(userId, payload) {
  return apiClient(`/staff/${userId}`, {
    method: 'PUT',
    body: payload,
  });
}

export async function updateStaffStatus(userId, payload) {
  return apiClient(`/staff/${userId}/status`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function extendTemporaryAccount(userId, payload) {
  return apiClient(`/staff/${userId}/extend`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function fetchInvitations(filters = {}) {
  const query = buildInvitationListQuery(filters).toString();
  const suffix = query ? `?${query}` : '';
  return apiClient(`/invitations${suffix}`);
}

export async function createInvitation(payload) {
  return apiClient('/invitations', {
    method: 'POST',
    body: payload,
  });
}

export async function revokeInvitation(invitationId) {
  return apiClient(`/invitations/${invitationId}/revoke`, {
    method: 'POST',
  });
}

export async function fetchDepartments() {
  return apiClient('/departments');
}

export function getRoleLabel(role) {
  return {
    staff: 'Staff/User',
    technician: 'Technician',
    ict_officer: 'ICT Officer',
    admin: 'Administrator',
  }[role] || role || '-';
}

export function getUserTypeLabel(userType) {
  return {
    employee: 'Employee',
    intern: 'Intern',
    corper: 'Corper',
    contractor: 'Contractor',
    guest: 'Guest',
  }[userType] || userType || '-';
}

export function isTemporaryUser(userType) {
  return ['intern', 'corper', 'contractor', 'guest'].includes(userType);
}
