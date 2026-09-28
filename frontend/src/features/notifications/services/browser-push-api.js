import { apiClient } from '../../../lib/api-client.js';

export function browserPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export async function fetchBrowserPushPublicKey() {
  return apiClient('/notifications/browser/vapid-public-key');
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
  return apiClient('/notifications/browser/test', { method: 'POST' });
}

export async function registerBrowserPushDevice() {
  if (!browserPushSupported()) {
    throw new Error('Browser notifications are not supported on this device.');
  }

  const keyPayload = await fetchBrowserPushPublicKey();
  if (!keyPayload?.configured || !keyPayload.public_key) {
    throw new Error('Browser notifications are not configured on the server.');
  }

  const permission = await window.Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Browser notification permission was not granted.');
  }

  const registration = await navigator.serviceWorker.register('/notification-sw.js');
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyPayload.public_key),
    }));

  return saveBrowserPushSubscription(subscription.toJSON());
}
