// Learning Tree Connect - Service Worker for Push Notifications
const CACHE_NAME = 'learning-tree-v1';

// Install event
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = {
      title: 'Learning Tree',
      body: event.data.text(),
    };
  }

  const data = payload.data || {};
  const isUrgentPickup = data.type === 'parent_arrival' || data.priority === 'urgent';

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/favicon.ico',
    badge: payload.badge || '/favicon.ico',
    tag: payload.tag || 'default',
    data: data,
    dir: 'rtl',
    lang: 'ar',
    // High-priority: strong vibration pattern for urgent pickup alerts
    vibrate: isUrgentPickup
      ? [500, 200, 500, 200, 500, 200, 500, 200, 500]
      : (payload.vibrate || [200, 100, 200]),
    // Urgent notifications stay visible until user interacts
    requireInteraction: isUrgentPickup ? true : (payload.requireInteraction || false),
    // Do NOT make it silent - we want sound
    silent: false,
    actions: payload.actions || [],
    // Renotify even if same tag exists (for repeated alerts)
    renotify: isUrgentPickup,
  };

  // For urgent pickup alerts, also post a message to all open clients
  // so the in-app full-screen alert can show immediately
  const notificationPromise = self.registration.showNotification(
    payload.title || 'Learning Tree',
    options
  );

  const clientMessagePromise = isUrgentPickup
    ? self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PARENT_ARRIVAL_ALERT',
            payload: {
              pickupRequestId: data.pickupRequestId,
              childId: data.childId,
              title: payload.title,
              body: payload.body,
            },
          });
        });
      })
    : Promise.resolve();

  event.waitUntil(Promise.all([notificationPromise, clientMessagePromise]));
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  const action = event.action;

  // Handle acknowledge action from notification buttons
  if (action === 'acknowledge' && data.pickupRequestId) {
    event.notification.close();
    // Navigate to pickup page and let the in-app handler acknowledge
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Post message to client to trigger acknowledge
        for (const client of clientList) {
          client.postMessage({
            type: 'ACKNOWLEDGE_PICKUP',
            pickupRequestId: data.pickupRequestId,
          });
          client.focus();
          return;
        }
        // If no client open, open the pickup page
        if (self.clients.openWindow) {
          return self.clients.openWindow('/staff/pickup');
        }
      })
    );
    return;
  }

  event.notification.close();

  let url = data.url || '/';

  // Handle message notifications
  if (data.type === 'new_message') {
    url = '/staff/messages';
  }

  // Handle parent arrival - go to pickup page
  if (data.type === 'parent_arrival') {
    url = '/staff/pickup';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (url !== '/') {
            client.navigate(url);
          }
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  // Analytics or cleanup if needed
});
