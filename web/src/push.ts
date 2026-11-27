/**
 * Avisos push en el navegador: service worker, permiso, suscripción y sincronización con el Worker.
 * En el servidor solo se guarda la suscripción (identificador técnico) y los datos mínimos de cada aviso.
 */
import { API } from './api';
import { load } from './store';

export interface NotifPrefs { follow: boolean; alarms: boolean }
export const NO_PREFS: NotifPrefs = { follow: false, alarms: false };

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
export const permission = (): NotificationPermission | 'unsupported' => (pushSupported() ? Notification.permission : 'unsupported');

let regPromise: Promise<ServiceWorkerRegistration | null> | null = null;
export function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  return regPromise ??= navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => null);
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await registerSW();
  return reg ? reg.pushManager.getSubscription() : null;
}

const b64uToBytes = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

/** Pide permiso (debe llamarse al tocar un botón) y crea la suscripción. */
export async function subscribe(): Promise<PushSubscription> {
  if (!pushSupported()) throw new Error('unsupported');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'denied' : 'dismissed');
  const reg = await registerSW();
  if (!reg) throw new Error('sw');
  await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  const r = await fetch(`${API}/push/key`);
  if (!r.ok) throw new Error('server');
  const { publicKey } = (await r.json()) as { publicKey: string };
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(publicKey) });
}

/** Borra la suscripción en el navegador y todos los datos de avisos en el servidor. */
export async function unsubscribeAll(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  try { await fetch(`${API}/push/unsubscribe`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }); } catch { /* se reintentará */ }
  await sub.unsubscribe().catch(() => {});
}

export interface SyncPayload {
  follow: unknown | null;
  alarms: { id: string; def: unknown }[];
  plans: unknown[];
}

/** Envía al servidor el estado actual. Devuelve true si ha ido bien. */
export async function syncPush(payload: SyncPayload): Promise<boolean> {
  const prefs = load<NotifPrefs>('notif', NO_PREFS);
  const sub = await currentSubscription();
  if (!sub) return false;
  if (!prefs.follow && !prefs.alarms) { await unsubscribeAll(); return true; }
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  try {
    const r = await fetch(`${API}/push/sync`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subscription: json, wantFollow: prefs.follow, wantAlarms: prefs.alarms, ...payload }),
    });
    return r.ok;
  } catch { return false; }
}

/** Aviso de prueba local (sin servidor) para comprobar que el permiso funciona. */
export async function testNotification(title: string, body: string) {
  const reg = await registerSW();
  await reg?.showNotification(title, { body, icon: `${import.meta.env.BASE_URL}icon-192.png`, tag: 'test' });
}
