import { RT_BASE, normalizeAlerts, normalizeTripUpdates, normalizeVehicles } from './realtime.ts';
import { adminAlarms, adminPlans, runCron, sync, unsubscribe, validPlan, validSync, vapid } from './push.ts';
import type { TripRT } from './notify.ts';

export interface Env { DATA: KVNamespace; DB?: D1Database; ALLOWED_ORIGIN: string; ALLOW_HTTP_PUSH?: string /* solo pruebas locales */ }

const FEEDS = {
  'trip-updates': { file: 'trip_updates', normalize: normalizeTripUpdates },
  vehicles: { file: 'vehicle_positions', normalize: normalizeVehicles },
  alerts: { file: 'alerts', normalize: normalizeAlerts },
} as const;
type Kind = keyof typeof FEEDS;
const FRESH_SECONDS = 30;
/** Copia de respaldo en KV como mucho cada 5 min por feed: el plan gratuito permite 1 000 escrituras/día. */
const BACKUP_SECONDS = 300;
const lastBackup: Record<string, number> = {};

function cors(env: Env): Record<string, string> {
  return { 'access-control-allow-origin': env.ALLOWED_ORIGIN, 'access-control-allow-methods': 'GET, POST, DELETE', 'access-control-allow-headers': 'content-type' };
}
function json(data: unknown, env: Env, cache = 'public, max-age=60', status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache, ...cors(env) } });
}

/** Feed normalizado: caché de 30 s; si Renfe falla, último dato bueno guardado con `stale: true`. */
async function feed(kind: Kind, env: Env, ctx: ExecutionContext): Promise<{ status: number; body: any; cache: string }> {
  const cache = caches.default;
  const key = new Request(`https://cache.trenavis.invalid/rt/${kind}`);
  const hit = await cache.match(key);
  if (hit) return { status: 200, body: await hit.json(), cache: `public, max-age=${FRESH_SECONDS}` };
  try {
    const r = await fetch(`${RT_BASE}/${FEEDS[kind].file}.json`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`Renfe ${r.status}`);
    const raw = (await r.json()) as any;
    const body = { updatedAt: Number(raw?.header?.timestamp) || Math.floor(Date.now() / 1000), stale: false, data: FEEDS[kind].normalize(raw) };
    const tasks: Promise<unknown>[] = [cache.put(key, new Response(JSON.stringify(body), { headers: { 'cache-control': `public, max-age=${FRESH_SECONDS}` } }))];
    const now = Date.now() / 1000;
    if (now - (lastBackup[kind] ?? 0) > BACKUP_SECONDS) { lastBackup[kind] = now; tasks.push(env.DATA.put(`rt:${kind}`, JSON.stringify(body))); }
    ctx.waitUntil(Promise.all(tasks));
    return { status: 200, body, cache: `public, max-age=${FRESH_SECONDS}` };
  } catch {
    const last = await env.DATA.get(`rt:${kind}`, 'json') as { updatedAt: number; data: unknown } | null;
    if (last) return { status: 200, body: { ...last, stale: true }, cache: 'public, max-age=10' };
    return { status: 503, body: { error: 'sin datos en tiempo real', stale: true, data: [] }, cache: 'no-store' };
  }
}

async function tripsMap(env: Env, ctx: ExecutionContext): Promise<Map<string, TripRT> | null> {
  const f = await feed('trip-updates', env, ctx);
  if (f.status !== 200 || f.body.stale) return null;
  return new Map((f.body.data as { tripId: string; delay: number | null; canceled: boolean }[])
    .map((u) => [u.tripId, { delay: Math.max(0, Math.round((u.delay ?? 0) / 60)), canceled: u.canceled }]));
}

async function stored(key: string, env: Env): Promise<Response> {
  const raw = await env.DATA.get(key);
  if (raw === null) return json({ error: 'no encontrado' }, env, 'no-store', 404);
  return new Response(raw, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300', ...cors(env) } });
}

async function isAdmin(req: Request, env: Env): Promise<boolean> {
  const token = await env.DATA.get('admin-token');
  const given = req.headers.get('x-admin-token') ?? '';
  return !!token && token.length >= 32 && given === token;
}

async function readJson(req: Request): Promise<any> {
  if (Number(req.headers.get('content-length') ?? 0) > 64_000) return null;
  try { return await req.json(); } catch { return null; }
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(env) });
    const { pathname } = new URL(req.url);
    const parts = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);

    // --- Avisos push ---
    if (parts[0] === 'push') {
      if (!env.DB) return json({ error: 'avisos no disponibles' }, env, 'no-store', 503);
      if (parts[1] === 'key' && req.method === 'GET') {
        const k = await vapid(env);
        return k ? json({ publicKey: k.publicKey }, env, 'public, max-age=3600') : json({ error: 'avisos no configurados' }, env, 'no-store', 503);
      }
      if (parts[1] === 'sync' && req.method === 'POST') {
        const b = validSync(await readJson(req), env.ALLOW_HTTP_PUSH === '1');
        return b ? json(await sync(env, b), env, 'no-store') : json({ error: 'datos no válidos' }, env, 'no-store', 400);
      }
      if (parts[1] === 'unsubscribe' && req.method === 'POST') {
        const b = await readJson(req);
        if (typeof b?.endpoint !== 'string') return json({ error: 'datos no válidos' }, env, 'no-store', 400);
        await unsubscribe(env, b.endpoint);
        return json({ ok: true }, env, 'no-store');
      }
      return json({ error: 'no encontrado' }, env, 'no-store', 404);
    }
    // --- Administración (solo GitHub Actions, con token guardado en el KV) ---
    if (parts[0] === 'admin') {
      if (!env.DB || !(await isAdmin(req, env))) return json({ error: 'no autorizado' }, env, 'no-store', 403);
      if (parts[1] === 'alarms' && req.method === 'GET') return json(await adminAlarms(env), env, 'no-store');
      if (parts[1] === 'plans' && req.method === 'POST') {
        const b = await readJson(req);
        const plans = (Array.isArray(b?.plans) ? b.plans : []).map((p: any) => { const v = validPlan(p); return v && typeof p.subId === 'string' ? { ...v, subId: p.subId } : null; }).filter(Boolean);
        return json(await adminPlans(env, plans), env, 'no-store');
      }
      return json({ error: 'no encontrado' }, env, 'no-store', 404);
    }

    if (req.method !== 'GET') return json({ error: 'método no permitido' }, env, 'no-store', 405);
    if (['meta', 'stations', 'lines', 'places', 'station-areas'].includes(parts[0])) return stored(parts[0], env);
    if (parts[0] === 'trips' && /^[A-Za-z0-9]{1,5}$/.test(parts[1] ?? '')) return stored(`trips:${parts[1]}`, env);
    if (parts[0] === 'realtime' && parts[1] in FEEDS) { const f = await feed(parts[1] as Kind, env, ctx); return json(f.body, env, f.cache, f.status); }
    if (parts.length === 0) return json({ name: 'trenavis-api', endpoints: ['/api/meta', '/api/stations', '/api/lines', '/api/places', '/api/trips/:linea', '/api/realtime/trip-updates', '/api/realtime/vehicles', '/api/realtime/alerts', '/api/push/key', 'POST /api/push/sync', 'POST /api/push/unsubscribe'] }, env);
    return json({ error: 'no encontrado' }, env, 'no-store', 404);
  },

  async scheduled(_ev: ScheduledController, env: Env, ctx: ExecutionContext) {
    await runCron(env, () => tripsMap(env, ctx));
  },
} satisfies ExportedHandler<Env>;
