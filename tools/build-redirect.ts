/**
 * Sitio de redirección para la dirección antigua (GitHub Pages: lorennsw.github.io/trenavis) → nueva dirección principal.
 * - Copia los datos locales (avisos, favoritas, notas…) a la nueva dirección dentro del propio móvil (en el #fragmento,
 *   que no se envía a ningún servidor). No se copian las notificaciones: se dan de baja y se reactivan en la nueva.
 * - Sustituye el service worker antiguo por uno que se da de baja y redirige.
 * Uso: tsx tools/build-redirect.ts [salida]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] ?? 'dist-redirect';
const NEW = 'https://trenavis.lorennsw.workers.dev';
const API = 'https://trenavis-api.lorennsw.workers.dev/api';
const SKIP = ['notif', 'notifSync', 'installBannerClosed'];

const page = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>TrenAvís se ha mudado</title><meta name="robots" content="noindex">
<style>body{font:1rem/1.5 system-ui,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;background:#1240e0;color:#fff;text-align:center;padding:16px}a{color:#fff;font-weight:700}</style>
</head><body><main><h1>TrenAvís se ha mudado</h1><p>Te llevamos a la nueva dirección…</p><p><a id="go" href="${NEW}/">${NEW.replace('https://', '')}</a></p></main>
<script>
(async function () {
  var NEW = ${JSON.stringify(NEW)}, SKIP = ${JSON.stringify(SKIP)};
  // Destino: misma sección o página legal
  var path = location.pathname.replace(/^\\/trenavis/, '') || '/';
  var legal = path.match(/^\\/legal\\/([\\w-]+?)(\\.html)?$/);
  var target = NEW + (legal ? '/legal/' + legal[1] : '/');
  var hash = location.hash || '';
  // Datos locales a copiar
  var data = {};
  try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf('trenavis:') === 0 && SKIP.indexOf(k.slice(9)) < 0) data[k.slice(9)] = localStorage.getItem(k); } } catch (e) {}
  // Dar de baja las notificaciones de esta dirección y quitar el service worker antiguo
  try {
    var regs = await navigator.serviceWorker.getRegistrations();
    for (var r of regs) {
      var sub = await r.pushManager.getSubscription();
      if (sub) { try { await fetch(${JSON.stringify(API)} + '/push/unsubscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }); } catch (e) {} await sub.unsubscribe(); }
      await r.unregister();
    }
    for (var c of await caches.keys()) await caches.delete(c);
  } catch (e) {}
  if (!legal && Object.keys(data).length) {
    var json = JSON.stringify(data);
    hash = '#importar=' + btoa(unescape(encodeURIComponent(json))) + (hash && hash !== '#' ? '&ir=' + hash.slice(1) : '');
  }
  document.getElementById('go').href = target + hash;
  location.replace(target + hash);
})();
</script></body></html>`;

// Service worker "de baja": cuando el navegador lo actualice, se elimina y recarga las pestañas (que irán a la redirección).
const sw = `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
})()));`;

mkdirSync(join(out, 'legal'), { recursive: true });
for (const f of ['index.html', '404.html']) writeFileSync(join(out, f), page);
writeFileSync(join(out, 'sw.js'), sw);
writeFileSync(join(out, '.nojekyll'), '');
console.log(`Redirección → ${NEW} en ${out}/`);
