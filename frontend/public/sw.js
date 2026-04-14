// SilentEye Service Worker — Push Notifications
// This file MUST live at /public/sw.js so it has root scope

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'SilentEye', body: event.data.text() };
  }

  const title = payload.title || 'SilentEye';
  const options = {
    body: payload.body || 'Nueva alerta',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || 'silenteye-alert',
    renotify: true,
    requireInteraction: true, // Keep notification visible until user interacts
    vibrate: [300, 100, 300, 100, 300], // Urgent vibration pattern
    data: payload.data || {},
    actions: [
      { action: 'open', title: 'Ver alerta' },
      { action: 'dismiss', title: 'Cerrar' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  // Build URL with incident context so it survives redirects (citizen → /sos)
  const data = event.notification.data || {};
  let fallbackUrl = data.url || '/dashboard';
  if (data.incidentId) {
    const sep = fallbackUrl.includes('?') ? '&' : '?';
    fallbackUrl = `${fallbackUrl}${sep}incident=${data.incidentId}`;
  }
  if (data.activateCamera) {
    const sep = fallbackUrl.includes('?') ? '&' : '?';
    fallbackUrl = `${fallbackUrl}${sep}activateCamera=1`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to detect role from an open window's localStorage
      const resolveUrl = async () => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            client.navigate(fallbackUrl);
            return;
          }
        }
        return self.clients.openWindow(fallbackUrl);
      };
      return resolveUrl();
    })
  );
});
