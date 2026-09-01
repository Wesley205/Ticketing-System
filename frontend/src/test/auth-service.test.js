import test from 'node:test';
import assert from 'node:assert/strict';

import { getSession } from '../lib/auth-storage.js';
import {
  hydrateStoredSession,
  loginWithPassword,
  logoutSession,
  resolveGuestRoute,
  resolveProtectedRoute,
} from '../features/auth/services/auth-service.js';

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

test('loginWithPassword stores the backend session shape without exposing password fields', async () => {
  const storage = createStorage();
  const originalFetch = global.fetch;

  global.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({
      token: 'session-token',
      user: {
        user_id: 4,
        full_name: 'Amina Bello',
        role: 'technician',
        user_type: 'employee',
        access_profile: {
          role_label: 'Technician',
          permissions: {
            can_access_dashboard: true,
            can_access_technician_portal: true,
          },
          scope: {
            assigned_only: true,
          },
        },
      },
    }),
  });

  try {
    const session = await loginWithPassword(
      { identifier: 'amina', password: 'secret-value' },
      { storage }
    );

    assert.equal(session.token, 'session-token');
    assert.equal(session.user.full_name, 'Amina Bello');
    assert.equal(getSession(storage).token, 'session-token');
    assert.equal(getSession(storage).user.access_profile.permissions.can_access_technician_portal, true);
  } finally {
    global.fetch = originalFetch;
  }
});

test('logoutSession clears stored session state even when the backend rejects the token', async () => {
  const storage = createStorage();
  storage.setItem('nsc_token', 'expired-token');
  storage.setItem('nsc_user', JSON.stringify({ user_id: 9, role: 'staff' }));
  const originalFetch = global.fetch;

  global.fetch = async () => ({
    ok: false,
    status: 401,
    statusText: 'Unauthorized',
    headers: { get: () => 'application/json' },
    json: async () => ({ error: 'Session expired' }),
  });

  try {
    await logoutSession({ storage });
  } finally {
    global.fetch = originalFetch;
  }

  assert.deepEqual(getSession(storage), { token: null, user: null });
});

test('protected-route decisions redirect unauthenticated and forbidden users correctly', () => {
  assert.deepEqual(
    resolveProtectedRoute({
      isReady: true,
      isAuthenticated: false,
      accessProfile: null,
      permissionKey: 'can_access_dashboard',
      returnTo: '/dashboard',
    }),
    {
      allowed: false,
      reason: 'unauthenticated',
      redirectTo: '/login',
      returnTo: '/dashboard',
    }
  );

  assert.deepEqual(
    resolveProtectedRoute({
      isReady: true,
      isAuthenticated: true,
      accessProfile: {
        permissions: {
          can_access_dashboard: true,
        },
      },
      permissionKey: 'can_view_reports',
      returnTo: '/reports',
    }),
    {
      allowed: false,
      reason: 'forbidden',
      redirectTo: '/forbidden',
      returnTo: '/reports',
    }
  );
});

test('guest-route decisions send authenticated users to the default landing route', () => {
  const decision = resolveGuestRoute({
    isReady: true,
    isAuthenticated: true,
    accessProfile: {
      permissions: {
        can_access_dashboard: true,
      },
    },
  });

  assert.deepEqual(decision, { redirectTo: '/dashboard' });
});

test('hydrateStoredSession normalizes missing access profile data from legacy storage', () => {
  const storage = createStorage();
  storage.setItem('nsc_token', 'legacy-token');
  storage.setItem(
    'nsc_user',
    JSON.stringify({
      user_id: 2,
      full_name: 'Legacy User',
      role: 'ict_officer',
      department_id: 3,
    })
  );

  const session = hydrateStoredSession(storage);
  assert.equal(session.user.access_profile.role_label, 'ICT Officer');
  assert.equal(session.user.access_profile.permissions.can_view_reports, true);
});
