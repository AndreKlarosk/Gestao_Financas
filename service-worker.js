const CACHE_NAME = "financeapp-cache-v1";
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/dashboard.html",
  "/salary.html",
  "/expenses.html",
  "/categories.html",
  "/reminders.html",
  "/reports.html",
  "/settings.html",
  "/common.css",
  "/mobile.css",
  "/glass.css",
  "/login.js",
  "/db.js",
  "/dashboard.js",
  "/salary.js",
  "/expenses.js",
  "/categories.js",
  "/reminders.js",
  "/reports.js",
  "/settings.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
});
