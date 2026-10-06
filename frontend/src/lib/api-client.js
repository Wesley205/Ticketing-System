import { clearSession, getToken } from './auth-storage.js';
import { createHttpError, normalizeApiError } from './error-handling.js';

const DEFAULT_API_BASE_URL = '/api';

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function notifyUnauthorized(detail = {}) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }

  window.dispatchEvent(new CustomEvent('nsc:auth:unauthorized', { detail }));
}

export function getApiBaseUrl() {
  const explicit = import.meta.env?.VITE_API_BASE_URL;
  if (explicit) {
    return trimTrailingSlash(explicit);
  }

  return DEFAULT_API_BASE_URL;
}

export function getAuthToken(storage) {
  return getToken(storage);
}

export function resolveApiUrl(path, baseUrl = getApiBaseUrl()) {
  return `${trimTrailingSlash(baseUrl)}${path}`;
}

export function createRequestHeaders({ body, headers, token }) {
  const requestHeaders = new Headers(headers || {});

  if (!requestHeaders.has('Content-Type') && body && !(body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (token && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  return requestHeaders;
}

export function createApiClient(config = {}) {
  return {
    request(path, options) {
      return apiClient(path, { ...config, ...options });
    },
    download(path, options) {
      return apiDownload(path, { ...config, ...options });
    },
  };
}

export async function apiClient(path, options = {}) {
  const baseUrl = options.baseUrl || getApiBaseUrl();
  const token = options.includeAuth === false
    ? null
    : options.token || getAuthToken(options.storage);
  const headers = createRequestHeaders({
    body: options.body,
    headers: options.headers,
    token,
  });

  const response = await fetch(resolveApiUrl(path, baseUrl), {
    ...options,
    headers,
    body:
      options.body &&
      typeof options.body !== 'string' &&
      !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body,
  });

  if (response.status === 401 && options.clearSessionOnUnauthorized !== false) {
    clearSession(options.storage);
    notifyUnauthorized({ path, status: 401 });
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw normalizeApiError(
      createHttpError({
        message:
          (payload && typeof payload === 'object' && (payload.error || payload.message)) ||
          response.statusText ||
          'Request failed',
        status: response.status,
        payload,
      })
    );
  }

  return payload;
}

export async function apiDownload(path, options = {}) {
  const baseUrl = options.baseUrl || getApiBaseUrl();
  const token = options.includeAuth === false
    ? null
    : options.token || getAuthToken(options.storage);
  const headers = createRequestHeaders({
    body: null,
    headers: options.headers,
    token,
  });

  const response = await fetch(resolveApiUrl(path, baseUrl), {
    ...options,
    headers,
  });

  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    throw normalizeApiError(
      createHttpError({
        message: payload?.error || payload?.message || response.statusText || 'Download failed',
        status: response.status,
        payload,
      })
    );
  }

  return response.blob();
}
