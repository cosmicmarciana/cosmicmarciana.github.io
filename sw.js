/* sw.js - Cosmic Marciana PWA */
const VERSION = "cm-v1";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

// “App shell” básico (lo mínimo para que la app se sienta sólida)
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./bosque.html",
  "./player.html",
  "./site.webmanifest",

  "./favicon.ico",
  "./favicon-16x16.png",
  "./favicon-32x32.png",
  "./apple-touch-icon.png",
  "./android-chrome-192x192.png",
  "./android-chrome-512x512.png",

  // Si esto existe (tu vídeo del modo psicodélico)
  "./glitch.mp4",

  // Si estas imágenes existen (tele)
  "./tv.webp",
  "./tv1.webp","./tv2.webp","./tv3.webp","./tv4.webp","./tv5.webp","./tv6.webp",
  "./tv7.webp","./tv8.webp","./tv9.webp","./tv10.webp","./tv11.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Si alguna ruta no existe, no queremos que falle toda la instalación:
      await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k))
      );
      self.clients.claim();
    })()
  );
});

// Estrategias:
// - HTML: network-first (para que si cambias algo se actualice)
// - Assets: cache-first (rápido, pro)
// - MP3: network-first (no los precacheamos porque pesan; se evita cache gigante)
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Sólo GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Sólo tu mismo dominio
  if (url.origin !== self.location.origin) return;

  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  const isAudio = url.pathname.endsWith(".mp3");
  const isVideo = url.pathname.endsWith(".mp4");
  const isImage = /\.(png|jpg|jpeg|webp|gif|svg|ico)$/i.test(url.pathname);
  const isManifest = url.pathname.endsWith(".webmanifest") || url.pathname.endsWith("site.webmanifest");
  const isCSSJS = /\.(css|js)$/i.test(url.pathname);

  // HTML -> network-first
  if (isHTML) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(req);
        return cached || caches.match("./index.html");
      }
    })());
    return;
  }

  // Audio/Video -> network-first (sin inflar caché)
  if (isAudio || isVideo) {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch {
        // si algún día quieres offline real de audio, aquí podríamos hacer cache on-demand
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })());
    return;
  }

  // Assets -> cache-first
  if (isImage || isCSSJS || isManifest) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const fresh = await fetch(req);
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    })());
    return;
  }

  // Por defecto: intenta caché y si no, red
  event.respondWith((async () => {
    const cached = await caches.match(req);
    return cached || fetch(req);
  })());
});
