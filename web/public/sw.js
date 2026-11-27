/* TrenAvís – service worker: muestra los avisos push aunque la app esté cerrada. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

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
