/**
 * Tiempo real aplicado al horario: estado de cada tren, posición, trenes por línea, estado de las líneas.
 * Lógica pura (sin React) para poder probarla.
 */
import type { Alert, TripUpdate, Vehicle } from '../../../shared/realtime-types';
import type { Line } from '../../../shared/types';
import { scheduledPosition, type Run } from './timetable';

export interface RTTrip { delay: number; canceled: boolean; skipped: Set<string> }
export interface RTState {
  trips: Map<string, RTTrip>;
  vehicles: Map<string, Vehicle>;
  alerts: Alert[];
  updatedAt: number | null; // segundos UNIX
  stale: boolean;           // datos antiguos o no disponibles
}
export const EMPTY_RT: RTState = { trips: new Map(), vehicles: new Map(), alerts: [], updatedAt: null, stale: true };

/** Retrasos negativos (adelantos de 40 min…) son ruido del feed: se tratan como 0. Minutos enteros. */
export function buildRT(tus: TripUpdate[], vehicles: Vehicle[], alerts: Alert[], updatedAt: number | null, stale: boolean): RTState {
  const trips = new Map<string, RTTrip>();
  for (const u of tus) trips.set(u.tripId, {
    delay: Math.max(0, Math.round((u.delay ?? 0) / 60)),
    canceled: u.canceled,
    skipped: new Set(u.stops.filter((s) => s.skipped).map((s) => s.stopId)),
  });
  return { trips, vehicles: new Map(vehicles.map((v) => [v.tripId, v])), alerts, updatedAt, stale };
}

export type Status =
  | { kind: 'canceled' }
  | { kind: 'late'; min: number }
  | { kind: 'ontime' }
  | { kind: 'scheduled' }  // aún no ha salido y no hay datos: según horario
  | { kind: 'nodata' };    // debería estar circulando pero no hay datos en tiempo real

export const ONTIME_MAX = 1; // hasta 1 min de retraso se considera "a su hora"

/** ¿Este run es "de hoy" y está en la ventana en la que el tiempo real le puede afectar? */
export function isLiveCandidate(run: Run, date: string, today: string, nowMin: number): boolean {
  if (date !== today) return false;
  return nowMin >= run.dep[0] - 180 && nowMin <= run.arr[run.arr.length - 1] + 180;
}

export function runStatus(run: Run, rt: RTState, date: string, today: string, nowMin: number): Status {
  if (!isLiveCandidate(run, date, today, nowMin)) return { kind: 'scheduled' };
  const t = rt.trips.get(run.trip.id);
  if (t?.canceled) return { kind: 'canceled' };
  if (t) return t.delay > ONTIME_MAX ? { kind: 'late', min: t.delay } : { kind: 'ontime' };
  const started = nowMin >= run.dep[0] && nowMin <= run.arr[run.arr.length - 1];
  return started && !rt.stale ? { kind: 'nodata' } : { kind: 'scheduled' };
}

export const delayOf = (s: Status) => (s.kind === 'late' ? s.min : 0);

/** Posición: GPS si hay (estación + estado), si no, estimada con el horario y el retraso. */
export function livePosition(run: Run, rt: RTState, nowMin: number, delay: number):
  { cur: number; atStation: boolean; started: boolean; finished: boolean; source: 'gps' | 'estimate' } {
  const v = rt.vehicles.get(run.trip.id);
  const idx = v?.stopId ? run.stations.indexOf(v.stopId) : -1;
  if (v && idx >= 0) {
    const at = v.status === 'STOPPED_AT';
    const cur = at ? idx : idx - 1;
    return { cur, atStation: at, started: cur >= 0, finished: at && idx === run.stations.length - 1, source: 'gps' };
  }
  return { ...scheduledPosition(run, nowMin, delay), source: 'estimate' };
}

/** Sentido de un run respecto a la lista de estaciones de un sentido de la línea: 1 = mismo orden, -1 = inverso, 0 = no se puede saber. */
export function directionOn(run: Run, seq: string[]): 1 | -1 | 0 {
  const pos = new Map(seq.map((s, i) => [s, i]));
  let prev: number | undefined;
  for (const s of run.stations) {
    const i = pos.get(s);
    if (i === undefined) continue;
    if (prev !== undefined && i !== prev) return i > prev ? 1 : -1;
    prev = i;
  }
  return 0;
}

export interface TrainOnLine { run: Run; index: number; between: boolean; delay: number; source: 'gps' | 'estimate' }

/**
 * Trenes circulando ahora en un sentido de la línea, colocados sobre `seq` (lista de estaciones):
 * en la estación `index` o entre `index` e `index + 1` si `between`.
 */
export function trainsOnLine(runs: Run[], line: Line, seq: string[], rt: RTState, date: string, today: string, nowMin: number): TrainOnLine[] {
  const pos = new Map(seq.map((s, i) => [s, i]));
  const out: TrainOnLine[] = [];
  for (const run of runs) {
    if (run.trip.l !== line.id) continue;
    if (!isLiveCandidate(run, date, today, nowMin)) continue;
    if (directionOn(run, seq) !== 1) continue;
    const st = runStatus(run, rt, date, today, nowMin);
    if (st.kind === 'canceled') continue;
    const delay = delayOf(st);
    const p = livePosition(run, rt, nowMin, delay);
    if (!p.started || p.finished) continue;
    const here = pos.get(run.stations[p.cur]);
    if (here === undefined) continue;
    const between = !p.atStation;
    if (between && here >= seq.length - 1) continue;
    out.push({ run, index: here, between, delay, source: p.source });
  }
  return out.sort((a, b) => a.index - b.index || Number(a.between) - Number(b.between));
}

export type LineState = 'normal' | 'delays' | 'incident' | 'unknown';

/** Incidencia si hay avisos; retrasos si ≥ 30 % de los trenes en marcha llevan 5 min o más; sin datos si no hay tiempo real. */
export function lineState(line: Line, rt: RTState, liveRuns: Run[]): LineState {
  if (alertsForLine(line, rt.alerts).length) return 'incident';
  if (rt.stale) return 'unknown';
  const mine = liveRuns.filter((r) => r.trip.l === line.id && rt.trips.has(r.trip.id));
  if (!mine.length) return 'normal';
  const late = mine.filter((r) => rt.trips.get(r.trip.id)!.delay >= 5 || rt.trips.get(r.trip.id)!.canceled).length;
  return late / mine.length >= 0.3 ? 'delays' : 'normal';
}

export const alertsForLine = (line: Line, alerts: Alert[]) => alerts.filter((a) => a.routeIds.some((r) => line.routeIds.includes(r)));
export const alertsForStation = (station: string, lineObjs: Line[], alerts: Alert[]) =>
  alerts.filter((a) => a.stopIds.includes(station) || a.routeIds.some((r) => lineObjs.some((l) => l.routeIds.includes(r))));

/** ¿Se pierde el transbordo con los retrasos actuales? (llega después de que salga el segundo tren, con 2 min de margen) */
export function transferAtRisk(arr1: number, delay1: number, dep2: number, delay2: number, margin = 2): boolean {
  return arr1 + delay1 + margin > dep2 + delay2;
}
