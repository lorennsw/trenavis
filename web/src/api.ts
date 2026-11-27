/**
 * Carga de datos del Worker. Cada respuesta buena se guarda en Cache Storage; si no hay red se usa la última guardada.
 */
import type { Line, Meta, Place, Station, TripsFile } from '../../shared/types';
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

export interface Loaded { tt: Timetable; meta: Meta; offline: boolean; places: Place[] }

export async function loadAll(): Promise<Loaded> {
  const [meta, stations, lines] = await Promise.all([getJson<Meta>('meta'), getJson<Station[]>('stations'), getJson<Line[]>('lines')]);
  const [files, places] = await Promise.all([
    Promise.all(lines.data.map((l) => getJson<TripsFile>(`trips/${encodeURIComponent(l.id)}`))),
    getJson<Place[]>('places').then((x) => x.data).catch(() => [] as Place[]), // opcional: si falta, solo se busca por estación
  ]);
  return {
    tt: makeTimetable(stations.data, lines.data, files.map((f) => f.data)),
    meta: meta.data,
    places,
    offline: [meta, stations, lines, ...files].some((x) => x.fromCache),
  };
}

// ---------- Tiempo real ----------
import type { Alert, RealtimeResponse, TripUpdate, Vehicle } from '../../shared/realtime-types';
import { buildRT, EMPTY_RT, type RTState } from './core/live';

/** Descarga los tres feeds normalizados del Worker. Si falla, devuelve el estado anterior marcado como antiguo. */
export async function loadRealtime(prev: RTState = EMPTY_RT): Promise<RTState> {
  const get = async <T,>(k: string) => {
    const r = await fetch(`${API}/realtime/${k}`, { cache: 'no-store' });
    const j = (await r.json()) as RealtimeResponse<T>;
    if (!r.ok && !j.data) throw new Error(String(r.status));
    return j;
  };
  try {
    const [tu, vp, al] = await Promise.all([get<TripUpdate>('trip-updates'), get<Vehicle>('vehicles'), get<Alert>('alerts')]);
    const ageMin = (Date.now() / 1000 - (tu.updatedAt ?? 0)) / 60;
    return buildRT(tu.data ?? [], vp.data ?? [], al.data ?? [], tu.updatedAt ?? null, !!(tu.stale || ageMin > 10));
  } catch {
    return { ...prev, stale: true };
  }
}
