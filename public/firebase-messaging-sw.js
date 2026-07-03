// Import the Firebase scripts inside the service worker
importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js');

self.addEventListener('install', () => {
  console.log('[FCM][SERVICE_WORKER_INSTALL]');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[FCM][SERVICE_WORKER_ACTIVATE]');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('error', (event) => {
  console.error('[FCM][SERVICE_WORKER_ERROR]', event.message, event.filename, event.lineno, event.colno);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[FCM][SERVICE_WORKER_UNHANDLED_REJECTION]', event.reason);
});

// Initialize the Firebase app in the service worker by passing in the messagingSenderId
const firebaseConfig = {
  apiKey: "AIzaSyDmxwXQaotBlQTEnKzldYZWJEkOU4y4LjU",
  authDomain: "auth-synapsemd.firebaseapp.com",
  projectId: "auth-synapsemd",
  storageBucket: "auth-synapsemd.firebasestorage.app",
  messagingSenderId: "1023458728512",
  appId: "1:1023458728512:web:f56b0c475877fc5da61da5",
  measurementId: "G-1QHRPKEEQ2"
};

firebase.initializeApp(firebaseConfig);
console.log('[FCM][SERVICE_WORKER_FIREBASE_READY]', firebase.SDK_VERSION);

// Retrieve an instance of Firebase Cloud Messaging.
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM][SERVICE_WORKER_BACKGROUND_RECEIVED]', payload);
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    clientList.forEach((client) => {
      client.postMessage({
        type: 'FCM_BACKGROUND_RECEIVED',
        payload
      });
    });
  });

  const notificationTitle = payload.notification ? payload.notification.title : 'New Message';
  const notificationOptions = {
    body: payload.notification ? payload.notification.body : 'You have a new message.',
    icon: (payload.notification && payload.notification.icon) ? payload.notification.icon : '/favicon.ico',
    data: {
      url: (payload.data && (payload.data.url || payload.data.route || payload.data.path)) || '/user-mgmt/notifications'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
  console.log('[FCM][SERVICE_WORKER_NOTIFICATION_SHOWN]', {
    title: notificationTitle,
    body: notificationOptions.body,
    url: notificationOptions.data.url
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/user-mgmt/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
