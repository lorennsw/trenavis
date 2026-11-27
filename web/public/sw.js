/* TrenAvís – service worker: muestra los avisos push aunque la app esté cerrada. */
const SHELL = 'trenavis-shell-v1';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['./', 'manifest.webmanifest', 'icon-192.png'])).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('trenavis-shell-') && k !== SHELL) await caches.delete(k);
  await self.clients.claim();
})()));

/* La app le pasa los ficheros que ya ha cargado (en la primera visita aún no había service worker). */
self.addEventListener('message', (e) => {
  if (e.data?.type !== 'cache-urls') return;
  const urls = (e.data.urls || []).filter((u) => new URL(u).origin === self.location.origin);
  e.waitUntil(caches.open(SHELL).then((c) => Promise.all(urls.map((u) => c.add(u).catch(() => {})))));
});

/* Sin conexión: la app se abre con la última versión guardada (los horarios los guarda la propia app). */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(SHELL).then((c) => c.put('./', copy)); return r; })
      .catch(() => caches.match('./')));
    return;
  }
  if (new URL(req.url).pathname.includes('/assets/')) {  // ficheros con hash: no cambian nunca
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { const copy = r.clone(); caches.open(SHELL).then((c) => c.put(req, copy)); return r; })));
  }
});

self.addEventListener('push', (e) => {
  let m = { title: 'TrenAvís', body: '', tag: 'trenavis', url: '' };
  try { m = { ...m, ...e.data.json() }; } catch { /* mensaje vacío */ }
  e.waitUntil(self.registration.showNotification(m.title, {
    body: m.body, tag: m.tag, renotify: true, icon: 'icon-192.png', badge: 'icon-192.png',
    data: { url: m.url || '' }, lang: 'es',
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL(self.registration.scope + (e.notification.data?.url || ''), self.location.href).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) if (c.url.startsWith(self.registration.scope)) { await c.focus(); c.navigate(target); return; }
    await self.clients.openWindow(target);
  })());
});
