# Fase 5 – Avisos push con la app cerrada

## Cómo funciona
1. En **Más → Avisos** el usuario activa "Retrasos del tren que sigo" y/o "Alarmas de salida". Se pide permiso de
   notificaciones y se crea una **suscripción Web Push** (service worker `web/public/sw.js`).
2. La app envía al Worker (`POST /api/push/sync`) solo lo imprescindible: la suscripción, sus preferencias, sus alarmas
   (trayecto, días, hora, minutos) con los **próximos avisos ya calculados** (hoy y mañana) y el tren seguido.
   Se vuelve a enviar al abrir la app y cada vez que cambian alarmas, tren seguido o preferencias.
3. Cada día, GitHub Actions (`tools/plan-alarms.ts`) recalcula los avisos de hoy y mañana de todas las alarmas,
   para que lleguen aunque no se abra la app.
4. El Worker revisa **cada minuto** (Cron Trigger) y envía los avisos que tocan:
   - **Alarmas**: a la hora calculada **+ el retraso real** del tren en ese momento; si está cancelado, avisa de ello.
   - **Tren seguido**: cuando el retraso cambia (≥ 3 min), se cancela o vuelve a ir a su hora. Sin repetir avisos.
5. Al desactivar todos los avisos se borra la suscripción y todos sus datos del servidor (`POST /api/push/unsubscribe`).
   Los trenes seguidos se borran solos a las 24 h o al llegar; las suscripciones caducadas (404/410) se borran al enviar.

## Piezas
- `worker/src/webpush.ts`: cifrado aes128gcm (RFC 8291) + VAPID (RFC 8292) con WebCrypto, sin dependencias.
- `worker/src/notify.ts`: decide qué avisos enviar (lógica pura, `tests/notify.test.ts`).
- `worker/src/push.ts`: base de datos D1 (tablas `subs`, `alarms`, `plans`, `follows`), endpoints y revisión del minuto.
  Si el servicio push falla temporalmente, el aviso se reintenta en la siguiente revisión (hasta 30 min).
- `tools/ensure-d1.sh`: crea la base de datos D1 al desplegar (necesita el permiso **D1: Edit** en el token). Sin permiso,
  se despliega todo menos los avisos.
- `tools/ensure-secrets.ts`: crea una sola vez las claves VAPID y un token de administración y los guarda en el KV.
- `web/src/push.ts`, `web/src/usePushSync.ts`, `web/src/components/NotificationsSettings.tsx`: lado de la app.
- Manifiesto e icono propio (`web/public/`) para poder instalarla (requisito de iOS para los avisos).

## iPhone
Web Push solo funciona si la app está instalada en la pantalla de inicio (iOS 16.4+). La app lo explica con una guía.

## Pruebas hechas
- Unitarias: cifrado (descifrado por un receptor de prueba), firma VAPID, decisiones de aviso, hora de Madrid ↔ UNIX
  con cambio de hora, planes de alarma.
- De principio a fin en local: Worker + D1 local + servicio push falso → suscripción, aviso enviado y descifrado,
  sin repetición, baja borrando datos, validación y acceso de administración, planificación diaria.
