import { describe, it, expect } from 'vitest';
import { b64u, encryptPayload, generateVapidKeys, vapidAuth } from '../worker/src/webpush';

const te = new TextEncoder();
const concat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, n: number) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, n * 8));
}

/** Receptor de prueba: descifra como lo haría el navegador (RFC 8291). */
async function decrypt(body: Uint8Array, ua: CryptoKeyPair, authSecret: Uint8Array) {
  const salt = body.slice(0, 16), idlen = body[20], asPublic = body.slice(21, 21 + idlen), ct = body.slice(21 + idlen);
  const uaPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey));
  const asKey = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, ua.privateKey, 256));
  const ikm = await hkdf(authSecret, shared, concat(te.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ct));
  expect(pt[pt.length - 1]).toBe(2); // delimitador del último registro
  return new TextDecoder().decode(pt.slice(0, -1));
}

describe('Web Push', () => {
  it('cifra un mensaje que el navegador puede descifrar', async () => {
    const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
    const auth = crypto.getRandomValues(new Uint8Array(16));
    const p256dh = b64u.enc(await crypto.subtle.exportKey('raw', ua.publicKey));
    const msg = JSON.stringify({ title: 'Sal de casa en 5 min', body: 'R4 de las 08:25 · +3 min' });
    const body = await encryptPayload(te.encode(msg), p256dh, b64u.enc(auth));
    expect(new DataView(body.buffer).getUint32(16)).toBe(4096);
    expect(await decrypt(body, ua, auth)).toBe(msg);
  });
  it('genera una cabecera VAPID con un JWT ES256 verificable', async () => {
    const keys = await generateVapidKeys();
    expect(b64u.dec(keys.publicKey).length).toBe(65);
    const h = await vapidAuth('https://fcm.googleapis.com/fcm/send/abc', keys, 'https://lorennsw.github.io/trenavis/', 1_800_000_000);
    const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(h)!;
    expect(m[4]).toBe(keys.publicKey);
    const payload = JSON.parse(new TextDecoder().decode(b64u.dec(m[2])));
    expect(payload).toEqual({ aud: 'https://fcm.googleapis.com', exp: 1_800_000_000 + 43200, sub: 'https://lorennsw.github.io/trenavis/' });
    const pub = await crypto.subtle.importKey('raw', b64u.dec(keys.publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, b64u.dec(m[3]), te.encode(`${m[1]}.${m[2]}`))).toBe(true);
  });
});
