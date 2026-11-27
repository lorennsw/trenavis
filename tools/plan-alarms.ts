/**
 * Planificación diaria de avisos (GitHub Actions): pide al Worker las alarmas activas, calcula con el horario
 * los viajes de hoy y mañana y los guarda. Así los avisos llegan aunque el usuario no abra la app.
 * Necesita ADMIN_TOKEN (lo da tools/ensure-secrets.ts) y data/out generado por build-gtfs.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { makeTimetable } from '../web/src/core/timetable.ts';
import { alarmPlans } from '../web/src/core/pushplans.ts';
import { madridNow } from '../web/src/core/time.ts';
import type { Alarm } from '../web/src/core/alarms.ts';

const API = process.env.API_URL ?? 'https://trenavis-api.lorennsw.workers.dev/api';
const TOKEN = process.env.ADMIN_TOKEN ?? '';
const out = process.argv[2] ?? 'data/out';

async function main() {
  if (!TOKEN) throw new Error('Falta ADMIN_TOKEN');
  const headers = { 'x-admin-token': TOKEN, 'content-type': 'application/json' };
  // Un token recién creado tarda hasta ~60 s en propagarse por el KV de Cloudflare: se reintenta
  let r = await fetch(`${API}/admin/alarms`, { headers });
  for (let i = 0; r.status === 403 && i < 6; i++) { await new Promise((ok) => setTimeout(ok, 15000)); r = await fetch(`${API}/admin/alarms`, { headers }); }
  if (r.status === 503) { console.log('Avisos no disponibles todavía (sin base de datos).'); return; }
  if (!r.ok) throw new Error(`admin/alarms ${r.status}`);
  const alarms = (await r.json()) as { subId: string; id: string; def: Omit<Alarm, 'id' | 'on'> }[];
  const tt = makeTimetable(JSON.parse(readFileSync(join(out, 'stations.json'), 'utf8')), JSON.parse(readFileSync(join(out, 'lines.json'), 'utf8')),
    readdirSync(join(out, 'trips')).map((f) => JSON.parse(readFileSync(join(out, 'trips', f), 'utf8'))));
  const now = madridNow();
  const plans = alarms.flatMap((a) => alarmPlans(tt, { ...a.def, id: a.id, on: true }, now).map((p) => ({ ...p, subId: a.subId })));
  const w = await fetch(`${API}/admin/plans`, { method: 'POST', headers, body: JSON.stringify({ plans }) });
  if (!w.ok) throw new Error(`admin/plans ${w.status}`);
  console.log(`Alarmas: ${alarms.length} · avisos planificados: ${plans.length}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
