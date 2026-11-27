/**
 * Integración con la app Android (Capacitor). En la web estas funciones no hacen nada.
 */
import { Capacitor } from '@capacitor/core';

export const isNative = () => Capacitor.isNativePlatform();
/** ¿La app se compiló con Firebase? (si no, llamar a Firebase cerraría la app) */
export const fcmEnabled = () => import.meta.env.VITE_FCM === '1';

let tokenWaiters: ((t: string | null) => void)[] = [];
const TOKEN_KEY = 'trenavis:fcmToken';
export const savedToken = (): string | null => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };

/** Se llama una vez al arrancar la app nativa. */
export async function initNative() {
  if (!isNative()) return;
  const [{ App }, { StatusBar, Style }, { PushNotifications }] = await Promise.all([
    import('@capacitor/app'), import('@capacitor/status-bar'), import('@capacitor/push-notifications'),
  ]);
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#1240e0' }).catch(() => {});

  // Botón "atrás" de Android: cierra la hoja abierta; si no hay, vuelve a la sección anterior o sale
  App.addListener('backButton', ({ canGoBack }) => {
    if (document.querySelector('[role=dialog]')) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); return; }
    if (canGoBack && location.hash && history.length > 1) history.back(); else App.exitApp();
  });

  // Notificaciones de Firebase
  await PushNotifications.createChannel({ id: 'avisos', name: 'Avisos y retrasos', description: 'Hora de salir y cambios en el tren que sigues', importance: 5, visibility: 1, vibration: true }).catch(() => {});
  PushNotifications.addListener('registration', (t) => {
    try { localStorage.setItem(TOKEN_KEY, t.value); } catch { /* */ }
    tokenWaiters.forEach((f) => f(t.value)); tokenWaiters = [];
  });
  PushNotifications.addListener('registrationError', () => { tokenWaiters.forEach((f) => f(null)); tokenWaiters = []; });
  PushNotifications.addListener('pushNotificationActionPerformed', (a) => {
    const url = (a.notification.data as { url?: string } | undefined)?.url;
    if (url?.startsWith('#')) location.hash = url.slice(1);
  });
  // Si ya tenía las notificaciones activadas, renovar el token (puede cambiar). Solo con Firebase configurado.
  let wants = false;
  try { const n = JSON.parse(localStorage.getItem('trenavis:notif') ?? 'null'); wants = !!(n?.follow || n?.alarms); } catch { /* */ }
  const perm = await PushNotifications.checkPermissions();
  if (fcmEnabled() && wants && perm.receive === 'granted') PushNotifications.register().catch(() => {});
}

export async function hideSplash() {
  if (!isNative()) return;
  const { SplashScreen } = await import('@capacitor/splash-screen');
  SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {});
}

export async function nativePermission(): Promise<NotificationPermission> {
  const { PushNotifications } = await import('@capacitor/push-notifications');
  const p = await PushNotifications.checkPermissions();
  return p.receive === 'granted' ? 'granted' : p.receive === 'denied' ? 'denied' : 'default';
}

/** Pide permiso y devuelve el token de Firebase. */
export async function nativeSubscribe(): Promise<string> {
  if (!fcmEnabled()) throw new Error('server');
  const { PushNotifications } = await import('@capacitor/push-notifications');
  const p = await PushNotifications.requestPermissions();
  if (p.receive !== 'granted') throw new Error(p.receive === 'denied' ? 'denied' : 'dismissed');
  const token = await new Promise<string | null>((ok) => { tokenWaiters.push(ok); PushNotifications.register().catch(() => ok(null)); setTimeout(() => ok(savedToken()), 15000); });
  if (!token) throw new Error('server');
  return token;
}

export async function nativeUnsubscribe(api: string) {
  const token = savedToken();
  if (token) { try { await fetch(`${api}/push/unsubscribe`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fcmToken: token }) }); } catch { /* */ } }
  const { PushNotifications } = await import('@capacitor/push-notifications');
  await PushNotifications.unregister().catch(() => {});
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* */ }
}
