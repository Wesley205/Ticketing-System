import { apiClient } from '../../../lib/api-client.js';
import {
  clearSession,
  getSession,
  normalizeStoredUser,
  setSession,
} from '../../../lib/auth-storage.js';
import { getDefaultAuthenticatedRoute, hasPermission } from '../../../permissions/access.js';

export async function loginWithPassword({ identifier, password }, options = {}) {
  const session = await apiClient('/auth/login', {
    method: 'POST',
    body: { identifier, password },
    clearSessionOnUnauthorized: false,
    storage: options.storage,
  });

  const normalized = {
    token: session.token,
    user: normalizeStoredUser(session.user),
  };

  setSession(normalized, options.storage);
  return normalized;
}

export async function acceptInvitation(payload, options = {}) {
  const session = await apiClient('/invitations/accept', {
    method: 'POST',
    body: payload,
    clearSessionOnUnauthorized: false,
    storage: options.storage,
  });

  const normalized = {
    token: session.token,
    user: normalizeStoredUser(session.user),
  };

  setSession(normalized, options.storage);
  return normalized;
}

export async function fetchCurrentUser(options = {}) {
  const user = await apiClient('/auth/me', {
    method: 'GET',
    storage: options.storage,
  });

  return normalizeStoredUser(user);
}

export async function logoutSession(options = {}) {
  try {
    await apiClient('/auth/logout', {
      method: 'POST',
      storage: options.storage,
    });
  } catch {
    // Clearing the local session is the primary logout guarantee for the incremental UI.
  } finally {
    clearSession(options.storage);
  }

  return { logged_out: true };
}

export function hydrateStoredSession(storage) {
  const session = getSession(storage);
  return {
    token: session.token,
    user: normalizeStoredUser(session.user),
  };
}

export function resolveProtectedRoute({ isReady, isAuthenticated, accessProfile, permissionKey, returnTo }) {
  if (!isReady) {
    return { allowed: false, reason: 'loading' };
  }

  if (!isAuthenticated) {
    return {
      allowed: false,
      reason: 'unauthenticated',
      redirectTo: '/login',
      returnTo,
    };
  }

  if (permissionKey && !hasPermission(accessProfile, permissionKey)) {
    return {
      allowed: false,
      reason: 'forbidden',
      redirectTo: '/forbidden',
      returnTo,
    };
  }

  return { allowed: true };
}

export function resolveGuestRoute({ isReady, isAuthenticated, accessProfile }) {
  if (!isReady) {
    return { redirectTo: null };
  }

  if (isAuthenticated) {
    return {
      redirectTo: getDefaultAuthenticatedRoute(accessProfile),
    };
  }

  return { redirectTo: null };
}
