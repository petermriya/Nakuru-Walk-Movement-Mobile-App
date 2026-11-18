/* Nakuru Walk service worker: shows walk reminders
   and opens the app at the right place when one is tapped.
   It caches nothing, so it never serves a stale page. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {}
  // Put a mark on the app icon; the app sets the exact number when it opens.
  if (self.navigator.setAppBadge) self.navigator.setAppBadge().catch(() => {});
  e.waitUntil(
    self.registration.showNotification(data.title || "Nakuru Walk", {
      body: data.body || "A walk is coming up.",
      icon: "/icons/192",
      badge: "/icons/badge", // Android shows only its shape, so it is white on clear
      // Same tag replaces: one reminder, one line per check-in's cheers, and so on.
      tag: data.tag || "walk",
      renotify: Boolean(data.renotify),
      timestamp: Date.now(),
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "/", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.location.origin));
      if (open) return open.navigate(url).then((c) => (c || open).focus());
      return self.clients.openWindow(url);
    }),
  );
});

// Phones sometimes replace a push address. Subscribe again and tell the server,
// so notifications keep arriving without the person doing anything.
self.addEventListener("pushsubscriptionchange", (e) => {
  e.waitUntil(
    (async () => {
      const old = e.oldSubscription;
      const sub =
        e.newSubscription ||
        (await self.registration.pushManager.subscribe(old ? old.options : { userVisibleOnly: true, applicationServerKey: await (await fetch("/api/push/key")).text() }));
      await fetch("/api/push/renew", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ old: old ? old.endpoint : null, sub: sub.toJSON() }),
      });
    })().catch(() => {}),
  );
});
