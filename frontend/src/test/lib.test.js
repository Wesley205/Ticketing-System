import test from 'node:test';
import assert from 'node:assert/strict';

import { getStorageKeys, setSession, getSession, clearSession } from '../lib/auth-storage.js';
import { normalizeApiError, normalizeErrorMessage } from '../lib/error-handling.js';
import { formatDate, formatDateTime, humanizeStatus, statusClassName } from '../lib/formatting.js';
import { buildQueryParams } from '../lib/query-params.js';
import { buildAccessProfile, getSecureWorkspaceLinks, hasPermission } from '../permissions/access.js';

function createStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

test('auth storage persists and clears token and user session data', () => {
  const storage = createStorage();
  setSession({ token: 'abc123', user: { user_id: 7, role: 'technician' } }, storage);

  const session = getSession(storage);
  assert.equal(session.token, 'abc123');
  assert.equal(session.user.user_id, 7);
  assert.equal(session.user.role, 'technician');
  assert.equal(session.user.access_profile.permissions.can_access_technician_portal, true);

  clearSession(storage);
  assert.deepEqual(getSession(storage), { token: null, user: null });
});

test('auth storage exposes stable legacy storage keys', () => {
  assert.deepEqual(getStorageKeys(), {
    tokenKey: 'nsc_token',
    userKey: 'nsc_user',
  });
});

test('error helpers normalize api-like failures consistently', () => {
  const normalized = normalizeApiError({
    name: 'ApiError',
    status: 403,
    code: 'FORBIDDEN',
    payload: { error: 'Access denied.', details: ['tickets.view_all'] },
  });

  assert.equal(normalized.status, 403);
  assert.equal(normalized.code, 'FORBIDDEN');
  assert.equal(normalized.message, 'Access denied.');
  assert.deepEqual(normalized.details, ['tickets.view_all']);
  assert.equal(normalizeErrorMessage(new Error('Broken')), 'Broken');
});

test('formatting utilities preserve frontend-compatible display values', () => {
  assert.equal(formatDate('2026-08-31T00:00:00Z'), '31 Aug 2026');
  assert.match(formatDateTime('2026-08-31T13:45:00Z'), /31 Aug 2026/);
  assert.equal(humanizeStatus('Waiting_for_User'), 'Waiting for User');
  assert.equal(statusClassName('In Progress'), 'status-In-Progress');
});

test('query and permission helpers stay deterministic', () => {
  assert.equal(
    buildQueryParams({ status: 'Assigned', page: 2, empty: '' }).toString(),
    'status=Assigned&page=2'
  );

  const profile = buildAccessProfile({ user_id: 5, role: 'ict_officer', department_id: 3 });
  assert.equal(hasPermission(profile, 'can_view_reports'), true);
  assert.equal(hasPermission(profile, 'can_manage_users'), false);
});

test('secure workspace links are standardized by role and permissions', () => {
  const staffProfile = buildAccessProfile({ user_id: 6, role: 'staff', department_id: 2 });
  const technicianProfile = buildAccessProfile({ user_id: 7, role: 'technician', department_id: 2 });
  const adminProfile = buildAccessProfile({ user_id: 1, role: 'admin', department_id: 1 });

  assert.deepEqual(
    getSecureWorkspaceLinks(staffProfile).map((link) => link.to),
    ['/dashboard', '/service-requests?mine=1', '/knowledge-base']
  );
  assert.ok(getSecureWorkspaceLinks(technicianProfile).some((link) => link.to === '/technician/assigned-work'));
  assert.ok(getSecureWorkspaceLinks(adminProfile).some((link) => link.to === '/audit-logs'));
});
