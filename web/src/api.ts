/**
 * Carga de datos del Worker. Cada respuesta buena se guarda en Cache Storage; si no hay red se usa la última guardada.
 */
import type { Line, Meta, Station, TripsFile } from '../../shared/types';
import { makeTimetable, type Timetable } from './core/timetable';

export const API = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://trenavis-api.lorennsw.workers.dev/api';
const CACHE = 'trenavis-data-v1';

async function getJson<T>(path: string): Promise<{ data: T; fromCache: boolean }> {
  const url = `${API}/${path}`;
  let cache: Cache | undefined;
  try { cache = await caches.open(CACHE); } catch { /* sin Cache Storage */ }
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(String(r.status));
    if (cache) await cache.put(url, r.clone()).catch(() => {});
    return { data: (await r.json()) as T, fromCache: false };
  } catch (e) {
    const hit = await cache?.match(url);
    if (hit) return { data: (await hit.json()) as T, fromCache: true };
    throw e;
  }
}

export interface Loaded { tt: Timetable; meta: Meta; offline: boolean }

export async function loadAll(): Promise<Loaded> {
  const [meta, stations, lines] = await Promise.all([getJson<Meta>('meta'), getJson<Station[]>('stations'), getJson<Line[]>('lines')]);
  const files = await Promise.all(lines.data.map((l) => getJson<TripsFile>(`trips/${encodeURIComponent(l.id)}`)));
  return {
    tt: makeTimetable(stations.data, lines.data, files.map((f) => f.data)),
    meta: meta.data,
    offline: [meta, stations, lines, ...files].some((x) => x.fromCache),
  };
}
