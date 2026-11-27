/**
 * Avisos push: suscripciones y datos mínimos en D1, endpoints para la app y revisión cada minuto (cron).
 * Datos guardados (privacidad): suscripción push (identificador técnico), preferencias, alarmas (trayecto, días, hora,
 * minutos) y el tren seguido. Nada que identifique a la persona. Se borra todo al desactivar los avisos.
 */
import { decide, type FollowRow, type PlanRow, type TripRT } from './notify';
import { sendPush, type VapidKeys } from './webpush';

export interface PushEnv { DB?: D1Database; DATA: KVNamespace; ALLOW_HTTP_PUSH?: string }
const SUBJECT = 'https://trenavis.lorennsw.workers.dev/';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS subs (id TEXT PRIMARY KEY, endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, want_follow INTEGER NOT NULL DEFAULT 0, want_alarms INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS alarms (sub_id TEXT NOT NULL, id TEXT NOT NULL, def TEXT NOT NULL, PRIMARY KEY (sub_id, id))`,
  `CREATE TABLE IF NOT EXISTS plans (sub_id TEXT NOT NULL, alarm_id TEXT NOT NULL, date TEXT NOT NULL, notify_at INTEGER NOT NULL, lead INTEGER NOT NULL, dep_at INTEGER NOT NULL, trip_id TEXT NOT NULL, label TEXT NOT NULL, sent INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (sub_id, alarm_id, date))`,
  `CREATE INDEX IF NOT EXISTS plans_due ON plans (sent, notify_at)`,
  `CREATE TABLE IF NOT EXISTS follows (sub_id TEXT PRIMARY KEY, trip_id TEXT NOT NULL, dep_at INTEGER NOT NULL, arr_at INTEGER NOT NULL, label TEXT NOT NULL, last_delay INTEGER NOT NULL DEFAULT 0, last_canceled INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL)`,
];
let schemaReady = false;
async function ensureSchema(db: D1Database) {
  if (schemaReady) return;
  await db.batch(SCHEMA.map((s) => db.prepare(s)));
  schemaReady = true;
}

let vapidCache: VapidKeys | null = null;
export async function vapid(env: PushEnv): Promise<VapidKeys | null> {
  return vapidCache ??= await env.DATA.get('vapid', 'json') as VapidKeys | null;
}

async function subId(endpoint: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return [...new Uint8Array(h)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------- Validación de lo que manda la app ----------
const str = (v: unknown, max = 200) => (typeof v === 'string' && v.length > 0 && v.length <= max ? v : null);
const int = (v: unknown) => (Number.isInteger(v) ? (v as number) : null);
export interface PlanIn { alarmId: string; date: string; notifyAt: number; lead: number; depAt: number; tripId: string; label: string }
export interface SyncBody {
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  wantFollow: boolean; wantAlarms: boolean;
  follow: { tripId: string; depAt: number; arrAt: number; label: string; delay: number; canceled: boolean } | null;
  alarms: { id: string; def: unknown }[];
  plans: PlanIn[];
}
export function validPlan(p: any): PlanIn | null {
  const v = { alarmId: str(p?.alarmId, 40), date: /^\d{8}$/.test(p?.date) ? p.date : null, notifyAt: int(p?.notifyAt), lead: int(p?.lead), depAt: int(p?.depAt), tripId: str(p?.tripId, 40), label: str(p?.label, 160) };
  return Object.values(v).every((x) => x !== null) ? (v as PlanIn) : null;
}
export function validSync(b: any, allowHttp = false): SyncBody | null {
  const ep = str(b?.subscription?.endpoint, 1000), p256dh = str(b?.subscription?.keys?.p256dh, 200), auth = str(b?.subscription?.keys?.auth, 100);
  if (!ep || !p256dh || !auth) return null;
  if (!/^https:\/\//.test(ep) && !(allowHttp && /^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(ep))) return null; // http solo en pruebas locales
  const f = b.follow;
  const follow = f && str(f.tripId, 40) && int(f.depAt) !== null && int(f.arrAt) !== null && str(f.label, 160)
    ? { tripId: f.tripId, depAt: f.depAt, arrAt: f.arrAt, label: f.label, delay: Math.max(0, int(f.delay) ?? 0), canceled: !!f.canceled } : null;
  const alarms = (Array.isArray(b.alarms) ? b.alarms : []).slice(0, 20).filter((a: any) => str(a?.id, 40) && a.def && JSON.stringify(a.def).length < 1000);
  const plans = (Array.isArray(b.plans) ? b.plans : []).slice(0, 100).map(validPlan).filter(Boolean) as PlanIn[];
  return { subscription: { endpoint: ep, keys: { p256dh, auth } }, wantFollow: !!b.wantFollow, wantAlarms: !!b.wantAlarms, follow, alarms, plans };
}

async function deleteSub(db: D1Database, id: string) {
  await db.batch(['subs WHERE id', 'alarms WHERE sub_id', 'plans WHERE sub_id', 'follows WHERE sub_id'].map((w) => db.prepare(`DELETE FROM ${w} = ?`).bind(id)));
}

const upsertPlan = (db: D1Database, sub: string, p: PlanIn) => db.prepare(
  `INSERT INTO plans (sub_id, alarm_id, date, notify_at, lead, dep_at, trip_id, label, sent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
   ON CONFLICT (sub_id, alarm_id, date) DO UPDATE SET
     sent = CASE WHEN plans.notify_at = excluded.notify_at AND plans.trip_id = excluded.trip_id THEN plans.sent ELSE 0 END,
     notify_at = excluded.notify_at, lead = excluded.lead, dep_at = excluded.dep_at, trip_id = excluded.trip_id, label = excluded.label`,
).bind(sub, p.alarmId, p.date, p.notifyAt, p.lead, p.depAt, p.tripId, p.label);

/** Guarda el estado de avisos de un dispositivo. Si no quiere ningún aviso, se borra todo. */
export async function sync(env: PushEnv, body: SyncBody): Promise<{ ok: true; deleted?: boolean }> {
  const db = env.DB!;
  await ensureSchema(db);
  const id = await subId(body.subscription.endpoint);
  if (!body.wantFollow && !body.wantAlarms) { await deleteSub(db, id); return { ok: true, deleted: true }; }
  const now = Math.floor(Date.now() / 1000);
  const st: D1PreparedStatement[] = [
    db.prepare(`INSERT INTO subs (id, endpoint, p256dh, auth, want_follow, want_alarms, updated) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, want_follow = excluded.want_follow, want_alarms = excluded.want_alarms, updated = excluded.updated`)
      .bind(id, body.subscription.endpoint, body.subscription.keys.p256dh, body.subscription.keys.auth, +body.wantFollow, +body.wantAlarms, now),
    db.prepare('DELETE FROM alarms WHERE sub_id = ?').bind(id),
  ];
  if (body.wantAlarms) {
    for (const a of body.alarms) st.push(db.prepare('INSERT INTO alarms (sub_id, id, def) VALUES (?, ?, ?)').bind(id, a.id, JSON.stringify(a.def)));
    const keep = new Set(body.plans.map((p) => `${p.alarmId}|${p.date}`));
    const { results } = await db.prepare('SELECT alarm_id, date FROM plans WHERE sub_id = ?').bind(id).all<{ alarm_id: string; date: string }>();
    for (const r of results) if (!keep.has(`${r.alarm_id}|${r.date}`)) st.push(db.prepare('DELETE FROM plans WHERE sub_id = ? AND alarm_id = ? AND date = ?').bind(id, r.alarm_id, r.date));
    for (const p of body.plans) st.push(upsertPlan(db, id, p));
  } else st.push(db.prepare('DELETE FROM plans WHERE sub_id = ?').bind(id));
  if (body.wantFollow && body.follow) {
    const f = body.follow;
    st.push(db.prepare(`INSERT INTO follows (sub_id, trip_id, dep_at, arr_at, label, last_delay, last_canceled, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (sub_id) DO UPDATE SET
        last_delay = CASE WHEN follows.trip_id = excluded.trip_id THEN follows.last_delay ELSE excluded.last_delay END,
        last_canceled = CASE WHEN follows.trip_id = excluded.trip_id THEN follows.last_canceled ELSE excluded.last_canceled END,
        trip_id = excluded.trip_id, dep_at = excluded.dep_at, arr_at = excluded.arr_at, label = excluded.label, expires_at = excluded.expires_at`)
      .bind(id, f.tripId, f.depAt, f.arrAt, f.label, f.delay, +f.canceled, now + 24 * 3600));
  } else st.push(db.prepare('DELETE FROM follows WHERE sub_id = ?').bind(id));
  await db.batch(st);
  return { ok: true };
}

export async function unsubscribe(env: PushEnv, endpoint: string) {
  await ensureSchema(env.DB!);
  await deleteSub(env.DB!, await subId(endpoint));
}

// ---------- Admin (planificación diaria desde GitHub Actions) ----------
export async function adminAlarms(env: PushEnv) {
  await ensureSchema(env.DB!);
  const { results } = await env.DB!.prepare('SELECT a.sub_id, a.id, a.def FROM alarms a JOIN subs s ON s.id = a.sub_id WHERE s.want_alarms = 1').all<{ sub_id: string; id: string; def: string }>();
  return results.map((r) => ({ subId: r.sub_id, id: r.id, def: JSON.parse(r.def) }));
}
export async function adminPlans(env: PushEnv, plans: (PlanIn & { subId: string })[]) {
  await ensureSchema(env.DB!);
  const db = env.DB!;
  const st = plans.map((p) => upsertPlan(db, p.subId, p));
  for (let i = 0; i < st.length; i += 50) await db.batch(st.slice(i, i + 50));
  return { ok: true, n: plans.length };
}

// ---------- Revisión cada minuto ----------
export async function runCron(env: PushEnv, getTrips: () => Promise<Map<string, TripRT> | null>) {
  if (!env.DB) return;
  const db = env.DB;
  await ensureSchema(db);
  const now = Math.floor(Date.now() / 1000);
  const subCols = 's.endpoint, s.p256dh, s.auth';
  const [pl, fo] = await db.batch([
    db.prepare(`SELECT p.*, ${subCols} FROM plans p JOIN subs s ON s.id = p.sub_id WHERE p.sent = 0 AND p.notify_at BETWEEN ? AND ? AND s.want_alarms = 1`).bind(now - 3 * 3600, now + 3600),
    db.prepare(`SELECT f.*, ${subCols} FROM follows f JOIN subs s ON s.id = f.sub_id WHERE s.want_follow = 1`),
  ]);
  const plans = (pl.results ?? []) as (PlanRow & { endpoint: string; p256dh: string; auth: string })[];
  const follows = (fo.results ?? []) as (FollowRow & { endpoint: string; p256dh: string; auth: string })[];
  if (new Date().getUTCMinutes() % 30 === 0) await db.prepare('DELETE FROM plans WHERE notify_at < ?').bind(now - 2 * 86400).run(); // limpieza
  if (!plans.length && !follows.length) return;

  // Solo se consulta el tiempo real si hay algo que vigilar pronto
  const soon = plans.some((p) => p.notify_at - now < 3600) || follows.length > 0;
  const rt = soon ? await getTrips() : null;
  const d = decide(now, plans, follows, rt);
  const keys = await vapid(env);
  const subs = new Map([...plans, ...follows].map((x) => [x.sub_id, { endpoint: x.endpoint, p256dh: x.p256dh, auth: x.auth }]));
  const gone = new Set<string>();   // suscripción caducada (404/410): se borra todo
  const retry = new Set<string>();  // fallo temporal (red o 5xx/429): no se marca como enviado y se reintenta
  if (!keys) for (const s of d.sends) retry.add(s.sub_id);
  else for (const s of d.sends) {
    const sub = subs.get(s.sub_id);
    if (!sub || gone.has(s.sub_id)) continue;
    try {
      const status = await sendPush(sub, s.msg, keys, SUBJECT, env.ALLOW_HTTP_PUSH === '1');
      if (status === 404 || status === 410) gone.add(s.sub_id);
      else if (status >= 500 || status === 429) retry.add(s.sub_id);
    } catch { retry.add(s.sub_id); }
  }
  const sentTo = new Set(d.sends.map((s) => s.sub_id));
  const ok = (sub: string) => !retry.has(sub) || !sentTo.has(sub);
  const st: D1PreparedStatement[] = [
    ...d.planUpdates.filter((u) => ok(u.sub_id) || u.sent === 3).map((u) => db.prepare('UPDATE plans SET sent = ? WHERE sub_id = ? AND alarm_id = ? AND date = ?').bind(u.sent, u.sub_id, u.alarm_id, u.date)),
    ...d.followUpdates.filter((u) => ok(u.sub_id)).map((u) => db.prepare('UPDATE follows SET last_delay = ?, last_canceled = ? WHERE sub_id = ?').bind(u.last_delay, u.last_canceled, u.sub_id)),
    ...d.followDeletes.map((id) => db.prepare('DELETE FROM follows WHERE sub_id = ?').bind(id)),
  ];
  if (st.length) await db.batch(st);
  for (const id of gone) await deleteSub(db, id);
}
