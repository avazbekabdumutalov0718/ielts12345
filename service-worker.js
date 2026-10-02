const CACHE = 'vivid-ielts-v24-clean-runtime';
const SHELL = ['/', '/index.html', '/auth.html', '/styles.css', '/grammar.css', '/tenses.css', '/tenses.js', '/grammar-content.json', '/listening-boost.css', '/listening-engine.js', '/listening-data.json', '/speed-listening-data.json', '/writing-boost.css', '/writing-engine.js', '/writing-data.json', '/v15-upgrade.css', '/v17-classic.css', '/v19-upgrade.css', '/autumn-theme.css', '/autumn-theme.js', '/imported-library.css', '/imported-library.js', '/cloud.css', '/preparation.css', '/preparation.js', '/app.js', '/cloud.js', '/supabase-config.js', '/pwa.js', '/manifest.webmanifest', '/vivid-ielts-promo-v19-poster.jpg', '/vivid-ielts-promo-v19.mp4'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).catch(() => null));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok && !url.pathname.startsWith('/100day/')) {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') return caches.match('/index.html');
      throw new Error('offline');
    }
  })());
});
