/**
 * Horario de un día concreto a partir de los ficheros compactos del Worker.
 *
 * Un "Run" es un viaje que circula en la fecha consultada. Los viajes del día anterior que pasan de
 * medianoche (horas >= 24:00) también se incluyen, con sus horas desplazadas -1440 min, para que a las
 * 00:30 aparezcan los últimos trenes de la noche anterior.
 */
import type { Line, Station, Trip, TripsFile } from '../../../shared/types';
import { addDays } from './time';

export interface Run {
  key: string;          // id único del run (trip_id + fecha de servicio)
  trip: Trip;
  stations: string[];   // estaciones en orden
  arr: number[];        // minutos relativos a la medianoche de la fecha consultada
  dep: number[];
  serviceDate: string;  // fecha de servicio GTFS (YYYYMMDD)
  num: string;          // número de tren visible (p. ej. 15013)
}

export interface Timetable {
  stations: Map<string, Station>;
  lines: Map<string, Line>;
  files: TripsFile[];
}

export function makeTimetable(stations: Station[], lines: Line[], files: TripsFile[]): Timetable {
  return { stations: new Map(stations.map((s) => [s.id, s])), lines: new Map(lines.map((l) => [l.id, l])), files };
}

/** "5129J15013R15" -> "15013". Coincide con la etiqueta de los vehículos del tiempo real (R15-15013). */
export function trainNumber(tripId: string): string {
  return /^\d{4}[A-Z](\d+)/.exec(tripId)?.[1] ?? tripId;
}

const cache = new WeakMap<Timetable, Map<string, Run[]>>();

/** Viajes que circulan en `date` (más los de la víspera que pasan de medianoche). */
export function runsOn(tt: Timetable, date: string): Run[] {
  let byDate = cache.get(tt);
  if (!byDate) cache.set(tt, (byDate = new Map()));
  const hit = byDate.get(date);
  if (hit) return hit;

  const prev = addDays(date, -1);
  const out: Run[] = [];
  for (const f of tt.files) {
    const svcToday = f.services.map((d) => d.includes(date));
    const svcPrev = f.services.map((d) => d.includes(prev));
    for (const t of f.trips) {
      const stations = f.patterns[t.p];
      if (svcToday[t.s]) out.push({ key: `${t.id}@${date}`, trip: t, stations, arr: t.a, dep: t.d, serviceDate: date, num: trainNumber(t.id) });
      if (svcPrev[t.s] && t.a[t.a.length - 1] >= 1440)
        out.push({ key: `${t.id}@${prev}`, trip: t, stations, arr: t.a.map((x) => x - 1440), dep: t.d.map((x) => x - 1440), serviceDate: prev, num: trainNumber(t.id) });
    }
  }
  byDate.set(date, out);
  return out;
}

/** ¿Hay algún horario cargado para esta fecha? (el feed de Renfe tiene huecos) */
export function hasService(tt: Timetable, date: string): boolean {
  return tt.files.some((f) => f.services.some((d) => d.includes(date)));
}

export const origin = (r: Run) => r.stations[0];
export const destination = (r: Run) => r.stations[r.stations.length - 1];

export interface BoardRow { run: Run; idx: number; time: number }

/**
 * Panel de una estación: salidas (no incluye trenes que terminan aquí) o llegadas (no incluye trenes que empiezan aquí).
 */
export function board(tt: Timetable, station: string, date: string, fromMin: number, mode: 'dep' | 'arr', limit = 30, lines?: Set<string>): BoardRow[] {
  const rows: BoardRow[] = [];
  for (const run of runsOn(tt, date)) {
    if (lines?.size && !lines.has(run.trip.l)) continue;
    const idx = run.stations.indexOf(station);
    if (idx < 0) continue;
    if (mode === 'dep' && idx === run.stations.length - 1) continue;
    if (mode === 'arr' && idx === 0) continue;
    const time = mode === 'dep' ? run.dep[idx] : run.arr[idx];
    if (time >= fromMin) rows.push({ run, idx, time });
  }
  return rows.sort((a, b) => a.time - b.time || a.run.trip.l.localeCompare(b.run.trip.l)).slice(0, limit);
}

/** Posición según el horario (sin tiempo real): índice de la última parada pasada y si está detenido en ella. */
export function scheduledPosition(run: Run, nowMin: number, delay = 0): { cur: number; atStation: boolean; finished: boolean; started: boolean } {
  let cur = -1;
  for (let i = 0; i < run.stations.length; i++) if (run.arr[i] + delay <= nowMin) cur = i;
  const atStation = cur >= 0 && nowMin < run.dep[cur] + delay;
  return { cur, atStation, finished: cur === run.stations.length - 1, started: cur >= 0 };
}
