import { RT_BASE, normalizeAlerts, normalizeTripUpdates, normalizeVehicles } from './realtime.ts';

export interface Env { DATA: KVNamespace; ALLOWED_ORIGIN: string }

const FEEDS = {
  'trip-updates': { file: 'trip_updates', normalize: normalizeTripUpdates },
  vehicles: { file: 'vehicle_positions', normalize: normalizeVehicles },
  alerts: { file: 'alerts', normalize: normalizeAlerts },
} as const;
const FRESH_SECONDS = 30;
/** Copia de respaldo en KV como mucho cada 5 min por feed: el plan gratuito permite 1 000 escrituras/día. */
const BACKUP_SECONDS = 300;
const lastBackup: Record<string, number> = {};

function json(data: unknown, env: Env, cache = 'public, max-age=60', status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache, 'access-control-allow-origin': env.ALLOWED_ORIGIN },
  });
}

/** Tiempo real: caché de 30 s; si Renfe falla, último dato bueno guardado con `stale: true`. */
async function realtime(kind: keyof typeof FEEDS, env: Env, ctx: ExecutionContext): Promise<Response> {
  const cache = caches.default;
  const key = new Request(`https://cache.trenavis.invalid/rt/${kind}`);
  const hit = await cache.match(key);
  if (hit) return hit;

  const feed = FEEDS[kind];
  try {
    const r = await fetch(`${RT_BASE}/${feed.file}.json`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`Renfe ${r.status}`);
    const raw = (await r.json()) as any;
    const body = { updatedAt: Number(raw?.header?.timestamp) || Math.floor(Date.now() / 1000), stale: false, data: feed.normalize(raw) };
    const res = json(body, env, `public, max-age=${FRESH_SECONDS}`);
    const tasks: Promise<unknown>[] = [cache.put(key, res.clone())];
    const now = Date.now() / 1000;
    if (now - (lastBackup[kind] ?? 0) > BACKUP_SECONDS) {
      lastBackup[kind] = now;
      tasks.push(env.DATA.put(`rt:${kind}`, JSON.stringify(body)));
    }
    ctx.waitUntil(Promise.all(tasks));
    return res;
  } catch {
    const last = await env.DATA.get(`rt:${kind}`, 'json') as { updatedAt: number; data: unknown } | null;
    if (last) return json({ ...last, stale: true }, env, 'public, max-age=10');
    return json({ error: 'sin datos en tiempo real', stale: true, data: [] }, env, 'no-store', 503);
  }
}

async function stored(key: string, env: Env): Promise<Response> {
  const raw = await env.DATA.get(key);
  if (raw === null) return json({ error: 'no encontrado' }, env, 'no-store', 404);
  return new Response(raw, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300', 'access-control-allow-origin': env.ALLOWED_ORIGIN } });
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': env.ALLOWED_ORIGIN, 'access-control-allow-methods': 'GET' } });
    if (req.method !== 'GET') return json({ error: 'método no permitido' }, env, 'no-store', 405);
    const { pathname } = new URL(req.url);
    const parts = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);

    if (['meta', 'stations', 'lines', 'places'].includes(parts[0])) return stored(parts[0], env);
    if (parts[0] === 'trips' && /^[A-Za-z0-9]{1,5}$/.test(parts[1] ?? '')) return stored(`trips:${parts[1]}`, env);
    if (parts[0] === 'realtime' && parts[1] in FEEDS) return realtime(parts[1] as keyof typeof FEEDS, env, ctx);
    if (parts.length === 0) return json({ name: 'trenavis-api', endpoints: ['/api/meta', '/api/stations', '/api/lines', '/api/places', '/api/trips/:linea', '/api/realtime/trip-updates', '/api/realtime/vehicles', '/api/realtime/alerts'] }, env);
    return json({ error: 'no encontrado' }, env, 'no-store', 404);
  },
} satisfies ExportedHandler<Env>;
