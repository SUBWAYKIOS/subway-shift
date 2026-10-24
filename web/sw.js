// Service worker: mở app nhanh + mở được khi mạng chập chờn.
// MẠNG TRƯỚC (luôn lấy bản mới nhất nếu có mạng), mất mạng mới dùng bản đã lưu.
// Không đụng tới lệnh gọi máy chủ (POST tới script.google.com) — dữ liệu luôn là dữ liệu thật.
const CACHE = "sbw-%%BUILD%%";
const SHELL = ["./", "./index.html", "./app.html", "./config.js", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-180.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => {
    if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)).catch(() => {}); }
    return res;
  }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match("./app.html"))));
});
