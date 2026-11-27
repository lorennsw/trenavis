/**
 * Notificaciones para la app Android (Firebase Cloud Messaging, API HTTP v1) sin dependencias.
 * Autenticación: JWT RS256 firmado con la clave de la cuenta de servicio (secreto FIREBASE_SERVICE_ACCOUNT) → token OAuth.
 */
import type { Message } from './notify';

export interface ServiceAccount { project_id: string; client_email: string; private_key: string; token_uri?: string }

const b64u = (b: ArrayBuffer | Uint8Array | string) => {
  const u = typeof b === 'string' ? new TextEncoder().encode(b) : b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = ''; for (const x of u) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export async function signedJwt(sa: ServiceAccount, nowSec = Math.floor(Date.now() / 1000)): Promise<string> {
  const aud = sa.token_uri ?? 'https://oauth2.googleapis.com/token';
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64u(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud, iat: nowSec, exp: nowSec + 3600 }));
  const der = Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claims}`));
  return `${head}.${claims}.${b64u(sig)}`;
}

let cached: { token: string; exp: number } | null = null;
async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const r = await fetch(sa.token_uri ?? 'https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${await signedJwt(sa, now)}`,
  });
  if (!r.ok) throw new Error(`FCM OAuth ${r.status}`);
  const j = (await r.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, exp: now + j.expires_in };
  return j.access_token;
}

export function fcmBody(token: string, msg: Message) {
  return {
    message: {
      token,
      notification: { title: msg.title, body: msg.body },
      data: { url: msg.url, tag: msg.tag },
      android: { priority: 'HIGH', ttl: '1800s', notification: { channel_id: 'avisos', tag: msg.tag, color: '#1240E0' } },
    },
  };
}

/** Devuelve un código al estilo Web Push: 201 enviado, 410 token caducado (borrar), 5xx/429 reintentar. */
export async function sendFcm(sa: ServiceAccount, token: string, msg: Message): Promise<number> {
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: 'POST', headers: { Authorization: `Bearer ${await accessToken(sa)}`, 'content-type': 'application/json' },
    body: JSON.stringify(fcmBody(token, msg)),
  });
  if (r.ok) return 201;
  const err = await r.text();
  if (r.status === 404 || /UNREGISTERED|registration-token-not-registered/.test(err)) return 410;
  if (r.status === 400 && /INVALID_ARGUMENT/.test(err) && /token/i.test(err)) return 410;
  return r.status;
}
