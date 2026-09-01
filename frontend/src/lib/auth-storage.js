import { buildAccessProfile, normalizeAccessProfile } from '../permissions/access.js';

const TOKEN_KEY = 'nsc_token';
const USER_KEY = 'nsc_user';

function fallbackStorage() {
  const memory = new Map();

  return {
    getItem(key) {
      return memory.has(key) ? memory.get(key) : null;
    },
    setItem(key, value) {
      memory.set(key, String(value));
    },
    removeItem(key) {
      memory.delete(key);
    },
  };
}

export function getStorage(storage = globalThis.localStorage) {
  return storage || fallbackStorage();
}

export function getToken(storage) {
  return getStorage(storage).getItem(TOKEN_KEY);
}

export function setToken(token, storage) {
  getStorage(storage).setItem(TOKEN_KEY, token);
  return token;
}

export function clearToken(storage) {
  getStorage(storage).removeItem(TOKEN_KEY);
}

export function getUser(storage) {
  const raw = getStorage(storage).getItem(USER_KEY);
  if (!raw) return null;

  try {
    return normalizeStoredUser(JSON.parse(raw));
  } catch {
    clearSession(storage);
    return null;
  }
}

export function setUser(user, storage) {
  const normalized = normalizeStoredUser(user);
  getStorage(storage).setItem(USER_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearUser(storage) {
  getStorage(storage).removeItem(USER_KEY);
}

export function setSession({ token, user }, storage) {
  if (token) setToken(token, storage);
  if (user) setUser(user, storage);
  return { token, user };
}

export function getSession(storage) {
  return {
    token: getToken(storage),
    user: getUser(storage),
  };
}

export function clearSession(storage) {
  clearToken(storage);
  clearUser(storage);
}

export function getStorageKeys() {
  return {
    tokenKey: TOKEN_KEY,
    userKey: USER_KEY,
  };
}

export function normalizeStoredUser(user) {
  if (!user) return null;

  const accessProfile = normalizeAccessProfile(user.access_profile, user);

  return {
    ...user,
    access_profile: accessProfile || buildAccessProfile(user),
  };
}
