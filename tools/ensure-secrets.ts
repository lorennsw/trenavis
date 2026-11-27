/**
 * Crea una sola vez las claves VAPID (avisos push) y el token de administración, y los guarda en el KV del Worker.
 * Imprime el token de administración por stdout (para el paso siguiente del workflow, enmascarado).
 * Uso en GitHub Actions: npx tsx tools/ensure-secrets.ts
 */
import { generateVapidKeys } from '../worker/src/webpush.ts';

// API de Cloudflare directamente (wrangler mezcla avisos con el valor)
const KV = 'https://api.cloudflare.com/client/v4/accounts/26daaf7d50d86f84e8b2d985db7012a0/storage/kv/namespaces/c27f8eab03c845a0a0b1036c21aa1b72/values';
const auth = { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` };
async function get(key: string): Promise<string | null> {
  const r = await fetch(`${KV}/${key}`, { headers: auth });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`KV get ${key}: ${r.status}`);
  return r.text();
}
async function put(key: string, value: string) {
  const r = await fetch(`${KV}/${key}`, { method: 'PUT', headers: auth, body: value });
  if (!r.ok) throw new Error(`KV put ${key}: ${r.status}`);
}

const main = async () => {
  if (!(await get('vapid'))?.includes('publicKey')) { await put('vapid', JSON.stringify(await generateVapidKeys())); console.error('Claves VAPID creadas.'); }
  let token = await get('admin-token');
  if (!token || token.length < 32) {
    token = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');
    await put('admin-token', token);
    console.error('Token de administración creado.');
  }
  process.stdout.write(token);
};
main();
