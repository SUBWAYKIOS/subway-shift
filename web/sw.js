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

// ---- v45: THÔNG BÁO ĐẨY ----
// Mỗi quán đăng ký service worker này thêm một lần với phạm vi riêng (./p/MÃQUÁN/) để nhận thông báo
// của máy chủ quán đó. Nội dung đã mã hoá đầu-cuối (RFC 8291) — trình duyệt tự giải mã trước khi tới đây.
const BASE = new URL("./", self.location).href;
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { t: e.data ? e.data.text() : "" }; }
  const title = d.t || (d.s ? d.s + " シフト" : "シフト");
  const opt = { body: d.b || "", icon: BASE + "icons/icon-192.png", badge: BASE + "icons/icon-192.png", data: { u: d.u || BASE }, lang: "" };
  if (d.tag) { opt.tag = d.tag; opt.renotify = true; }
  e.waitUntil(self.registration.showNotification(title, opt));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.u) || BASE;
  let want = "";
  try { want = new URL(url).searchParams.get("s") || ""; } catch (x) {}
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) {
      let s = "";
      try { const u = new URL(c.url); if (!u.href.startsWith(BASE)) continue; s = u.searchParams.get("s") || ""; } catch (x) { continue; }
      if (!want || s === want) { if ("focus" in c) return c.focus(); }
    }
    return self.clients.openWindow ? self.clients.openWindow(url) : null;
  }));
});
