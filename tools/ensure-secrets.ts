/**
 * Crea una sola vez las claves VAPID (avisos push) y el token de administración, y los guarda en el KV del Worker.
 * Imprime el token de administración por stdout (para el paso siguiente del workflow, enmascarado).
 * Uso en GitHub Actions: npx tsx tools/ensure-secrets.ts
 */
import { execFileSync } from 'node:child_process';
import { generateVapidKeys } from '../worker/src/webpush.ts';

const W = ['wrangler', 'kv', 'key'];
const CFG = ['--binding', 'DATA', '--config', 'worker/wrangler.toml'];
function get(key: string): string | null {
  try { const v = execFileSync('npx', [...W, 'get', key, ...CFG], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); return v && !/not found/i.test(v) ? v : null; }
  catch { return null; }
}
function put(key: string, value: string) { execFileSync('npx', [...W, 'put', key, value, ...CFG], { stdio: ['ignore', 'ignore', 'inherit'] }); }

const main = async () => {
  if (!get('vapid')?.includes('publicKey')) { put('vapid', JSON.stringify(await generateVapidKeys())); console.error('Claves VAPID creadas.'); }
  let token = get('admin-token');
  if (!token || token.length < 32) {
    token = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');
    put('admin-token', token);
    console.error('Token de administración creado.');
  }
  process.stdout.write(token);
};
main();
