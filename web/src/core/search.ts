/**
 * Búsqueda de trayectos A -> B: directos y con un transbordo como máximo (en la misma estación).
 */
import { runsOn, type Run, type Timetable } from './timetable';

export interface Leg { run: Run; from: number; to: number } // índices de parada dentro del run
export interface Journey {
  legs: Leg[];
  dep: number;
  arr: number;
  transfers: number;
  transferStation?: string;
  transferWait?: number; // minutos de espera en el transbordo
}

export interface SearchOptions {
  windowMin?: number;      // buscar salidas en [after, after + windowMin]
  minTransfer?: number;    // tiempo mínimo de transbordo
  maxTransferWait?: number;
  lines?: Set<string>;     // si se indica, todos los tramos deben ser de estas líneas
  limit?: number;
}

const legDep = (l: Leg) => l.run.dep[l.from];
const legArr = (l: Leg) => l.run.arr[l.to];

export function search(tt: Timetable, from: string, to: string, date: string, after: number, o: SearchOptions = {}): Journey[] {
  const windowMin = o.windowMin ?? 240, minTransfer = o.minTransfer ?? 4, maxWait = o.maxTransferWait ?? 60;
  if (from === to) return [];
  const runs = runsOn(tt, date).filter((r) => !o.lines?.size || o.lines.has(r.trip.l));
  const until = after + windowMin;

  // Trenes que llegan a B: índice de B y salidas hacia B desde cada estación previa
  const toB = new Map<Run, number>();
  const towardB = new Map<string, { run: Run; idx: number; dep: number }[]>();
  for (const r of runs) {
    const b = r.stations.lastIndexOf(to);
    if (b <= 0) continue;
    toB.set(r, b);
    for (let i = 0; i < b; i++) {
      let arr = towardB.get(r.stations[i]);
      if (!arr) towardB.set(r.stations[i], (arr = []));
      arr.push({ run: r, idx: i, dep: r.dep[i] });
    }
  }
  for (const arr of towardB.values()) arr.sort((x, y) => x.dep - y.dep);

  const out: Journey[] = [];
  for (const r of runs) {
    const a = r.stations.indexOf(from);
    if (a < 0 || a === r.stations.length - 1) continue;
    const dep = r.dep[a];
    if (dep < after || dep > until) continue;

    const b = toB.get(r);
    if (b !== undefined && b > a) {
      out.push({ legs: [{ run: r, from: a, to: b }], dep, arr: r.arr[b], transfers: 0 });
      continue; // si el tren ya va directo, no buscamos transbordos desde él
    }
    // Un transbordo: bajar en X (después de A) y coger un tren que vaya a B
    let best: Journey | null = null;
    for (let j = a + 1; j < r.stations.length; j++) {
      const x = r.stations[j];
      const cands = towardB.get(x);
      if (!cands) continue;
      const tArr = r.arr[j];
      for (const c of cands) {
        if (c.dep < tArr + minTransfer) continue;
        if (c.dep > tArr + maxWait) break;
        if (c.run.trip.id === r.trip.id) continue;
        const bIdx = toB.get(c.run)!;
        if (bIdx <= c.idx) continue;
        const arr = c.run.arr[bIdx];
        if (!best || arr < best.arr || (arr === best.arr && c.dep - tArr > (best.transferWait ?? 0))) {
          best = { legs: [{ run: r, from: a, to: j }, { run: c.run, from: c.idx, to: bIdx }], dep, arr, transfers: 1, transferStation: x, transferWait: c.dep - tArr };
        }
      }
    }
    if (best) out.push(best);
  }
  return paretoFilter(out).sort((x, y) => x.dep - y.dep || x.arr - y.arr).slice(0, o.limit ?? 40);
}

/**
 * Quita los trayectos con transbordo que otro mejora sin desventaja (sale igual o más tarde, llega igual o antes,
 * con igual o menos transbordos). Los directos se muestran siempre: es una lista de horarios.
 */
export function paretoFilter(js: Journey[]): Journey[] {
  return js.filter((j) => j.transfers === 0 || !js.some((k) => k !== j && k.dep >= j.dep && k.arr <= j.arr && k.transfers <= j.transfers &&
    (k.dep > j.dep || k.arr < j.arr || k.transfers < j.transfers)));
}

export { legDep, legArr };
