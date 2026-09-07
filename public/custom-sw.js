// public/custom-sw.js

self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon.png', 
      badge: '/icon.png',
      vibrate: [200, 100, 200, 100, 200], // Vibration agressive pour le sport
      data: {
        url: data.url || '/dashboard', // URL à ouvrir quand on clique
      },
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// Quand l'utilisateur clique sur la notification, ça ouvre l'application
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});