const CACHE = 'adjutant-v40';
const SHELL = ['./index.html', './manifest.json', './icon.svg', './sw.js'];
const API_HOSTS = ['api.anthropic.com', 'calendarmcp.googleapis.com', 'gmailmcp.googleapis.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API calls always go to network
  if (API_HOSTS.some(h => url.hostname.includes(h))) {
    e.respondWith(fetch(e.request).catch(() =>
      new Response(JSON.stringify({error:'offline'}), {status:503, headers:{'Content-Type':'application/json'}})
    ));
    return;
  }

  // App shell: cache first, update in background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => {});
      return cached || network || caches.match('./index.html');
    })
  );
});
