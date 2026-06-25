/* Argus service worker — web push deadline nudges. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Argus", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "⏰ Deadline approaching";
  const options = {
    body: data.body || "An opportunity you're tracking is closing soon.",
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: data.tag || "Argus",
    data: { url: data.url || "/notifications" },
    requireInteraction: false,
    vibrate: [80, 40, 80],
  };
  // Must call showNotification inside waitUntil or the subscription can be dropped.
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/notifications";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
