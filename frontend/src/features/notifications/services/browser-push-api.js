import { apiClient } from '../../../lib/api-client.js';

export function browserPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export function getBrowserPushSupportStatus() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      supported: false,
      reason: 'Browser alerts are only available in a browser session.',
    };
  }

  if (!window.isSecureContext) {
    return {
      supported: false,
      reason: 'Browser alerts require HTTPS or localhost. Open this system over a secure address to enable this device.',
    };
  }

  if (!('Notification' in window)) {
    return {
      supported: false,
      reason: 'This browser does not support notification permission prompts.',
    };
  }

  if (!('serviceWorker' in navigator)) {
    return {
      supported: false,
      reason: 'This browser does not support service workers required for alerts.',
    };
  }

  if (!('PushManager' in window)) {
    return {
      supported: false,
      reason: 'This browser does not support web push subscriptions.',
    };
  }

  return { supported: true, reason: '' };
}

export function normalizeVapidPublicKey(publicKey = '') {
  return String(publicKey || '')
    .trim()
    .replace(/\\([_-])/g, '$1')
    .replace(/\s+/g, '');
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const decoder = globalThis.atob || window?.atob;
  if (typeof decoder !== 'function') {
    throw new Error('Base64 decoder is not available.');
  }
  const rawData = decoder(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function decodeVapidPublicKey(publicKey = '') {
  const trimmed = normalizeVapidPublicKey(publicKey);
  if (!trimmed) {
    throw new Error('Browser notifications are not configured on the server.');
  }

  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    throw new Error('Browser notification public key is invalid. Generate a VAPID public/private key pair and update the server environment.');
  }

  let decoded;
  try {
    decoded = urlBase64ToUint8Array(trimmed);
  } catch {
    throw new Error('Browser notification public key is invalid. Generate a VAPID public/private key pair and update the server environment.');
  }

  if (decoded.byteLength !== 65) {
    throw new Error('Browser notification public key is invalid. VAPID public keys must decode to 65 bytes.');
  }

  return decoded;
}

export async function fetchBrowserPushPublicKey() {
  return apiClient('/notifications/browser/vapid-public-key', {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });
}

export async function listBrowserPushSubscriptions() {
  return apiClient('/notifications/browser-subscriptions/me');
}

export async function saveBrowserPushSubscription(subscription) {
  return apiClient('/notifications/browser-subscriptions', {
    method: 'POST',
    body: { subscription },
  });
}

export async function disableBrowserPushSubscription(subscriptionId) {
  return apiClient(`/notifications/browser-subscriptions/${subscriptionId}`, {
    method: 'DELETE',
  });
}

export async function sendBrowserPushTest() {
  return apiClient('/notifications/browser/test', {
    method: 'POST',
    body: {},
  });
}

async function ensureBrowserPushDevice({ requestPermission = false } = {}) {
  const support = getBrowserPushSupportStatus();
  if (!support.supported) {
    throw new Error(support.reason || 'Browser notifications are not supported on this device.');
  }

  let permission = window.Notification.permission;
  if (permission === 'default' && !requestPermission) {
    return { status: 'permission_required' };
  }
  if (permission === 'denied') {
    return { status: 'denied' };
  }

  if (permission !== 'granted') {
    permission = await window.Notification.requestPermission();
  }
  if (permission !== 'granted') {
    throw new Error('Browser notification permission was not granted.');
  }

  const keyPayload = await fetchBrowserPushPublicKey();
  if (!keyPayload?.configured || !keyPayload.public_key) {
    throw new Error('Browser notifications are not configured on the server.');
  }

  const registration = await navigator.serviceWorker.register('/notification-sw.js');
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeVapidPublicKey(keyPayload.public_key),
    }));

  return saveBrowserPushSubscription(subscription.toJSON());
}

export function registerBrowserPushDevice() {
  return ensureBrowserPushDevice({ requestPermission: true });
}

export function restoreBrowserPushDevice() {
  return ensureBrowserPushDevice({ requestPermission: false });
}
