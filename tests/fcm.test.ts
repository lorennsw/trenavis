import { describe, it, expect, vi, afterEach } from 'vitest';
import { signedJwt, sendFcm, fcmBody } from '../worker/src/fcm';
import { validSync } from '../worker/src/push';

async function serviceAccount() {
  const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', kp.privateKey));
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der)).replace(/(.{64})/g, '$1\n')}\n-----END PRIVATE KEY-----\n`;
  return { sa: { project_id: 'trenavis', client_email: 'push@trenavis.iam.gserviceaccount.com', private_key: pem }, kp };
}
const dec = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

afterEach(() => vi.unstubAllGlobals());

describe('Firebase (app Android)', () => {
  it('firma un JWT RS256 válido para pedir el token OAuth', async () => {
    const { sa, kp } = await serviceAccount();
    const jwt = await signedJwt(sa, 1_800_000_000);
    const [h, c, s] = jwt.split('.');
    expect(JSON.parse(new TextDecoder().decode(dec(c)))).toMatchObject({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', exp: 1_800_003_600 });
    expect(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', kp.publicKey, dec(s), new TextEncoder().encode(`${h}.${c}`))).toBe(true);
  });
  it('envía con el token OAuth y traduce "token caducado" a 410', async () => {
    const { sa } = await serviceAccount();
    const calls: { url: string; body: string }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      if (url.includes('oauth2')) return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }));
      return calls.length === 2 ? new Response('{}', { status: 200 }) : new Response('{"error":{"status":"NOT_FOUND","details":[{"errorCode":"UNREGISTERED"}]}}', { status: 404 });
    }));
    const msg = { title: 'Sal de casa en 5 min', body: 'R4 de las 08:25', tag: 'alarm-a1', url: '#avisos' };
    expect(await sendFcm(sa, 'abc', msg)).toBe(201);
    expect(calls[1].url).toBe('https://fcm.googleapis.com/v1/projects/trenavis/messages:send');
    expect(JSON.parse(calls[1].body)).toEqual(fcmBody('abc', msg));
    expect(await sendFcm(sa, 'viejo', msg)).toBe(410);
  });
  it('acepta el token de la app en la sincronización', () => {
    const b = validSync({ fcmToken: 'dK3:APA91b-xyz_1', wantFollow: true, wantAlarms: false, follow: null, alarms: [], plans: [] });
    expect(b?.subscription.endpoint).toBe('fcm:dK3:APA91b-xyz_1');
    expect(validSync({ fcmToken: 'mal token<>' })).toBeNull();
  });
});
