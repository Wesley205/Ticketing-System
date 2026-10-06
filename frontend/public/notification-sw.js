self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  let rawMessage = '';

  try {
    if (event.data) {
      rawMessage = event.data.text();
      payload = rawMessage ? JSON.parse(rawMessage) : {};
    }
  } catch {
    payload = rawMessage ? { body: rawMessage } : {};
  }

  const title = payload.title || 'NSC notification';
  const notificationId = payload.notificationId || payload.notification_id || null;
  const actionUrl = payload.actionUrl || payload.action_url || '/notifications';
  const options = {
    body: payload.body || payload.message || 'A secure system notification requires attention.',
    data: {
      actionUrl,
      notificationId,
    },
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    requireInteraction: payload.severity === 'critical' || payload.severity === 'urgent',
    tag: notificationId ? `nsc-notification-${notificationId}` : `nsc-notification-${Date.now()}`,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const actionUrl = event.notification.data?.actionUrl || '/notifications';
  const targetUrl = new URL(actionUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
