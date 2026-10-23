// Việt Tương Tác — Service Worker: nhận thông báo đẩy (Web Push)
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener("push", function (e) {
  var d = {};
  if (e.data) {
    try { d = e.data.json(); } catch (_) {
      try { d = { body: e.data.text() }; } catch (__) { d = {}; }
    }
  }
  var title = d.title || "Việt Tương Tác";
  var opts = {
    body: d.body || "",
    icon: d.icon || "/icon-192.png",
    badge: d.badge || "/icon-192.png",
    data: { url: d.url || "/" }
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var target = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c.url.indexOf(self.location.origin) === 0 && "focus" in c) {
          if ("navigate" in c) { try { c.navigate(target); } catch (_) {} }
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
