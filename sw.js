// Service worker cho Study — Tự học TOEIC
// Cache "app shell" (giao diện + khung ngữ pháp/từ vựng) để mở nhanh và dùng được khi mất mạng.
// Dữ liệu tiến độ, điểm số, câu hỏi/từ vựng do Admin thêm... vẫn cần mạng vì nằm trên Firebase.

const CACHE_NAME = "toeic-study-v3";
const APP_SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Chiến lược: network-first cho index.html (để luôn lấy bản mới nhất khi có mạng),
// fallback về cache khi mất mạng. Các file tĩnh khác thì cache-first.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Không can thiệp vào các request tới Firebase — luôn cần mạng thật, không cache.
  if (req.url.includes("firebaseio.com") || req.url.includes("googleapis.com")) return;

  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const resClone = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
      return res;
    }).catch(() => cached))
  );
});
