/**
 * Alarmas: trayecto habitual + "llegar antes de" / "salir después de" una hora, días, minutos a pie y aviso previo.
 * Calcula el mejor tren y "sal de casa a las X" con el retraso real (si es hoy).
 */
import { search, type Journey } from './search';
import { addDays } from './time';
import type { Timetable } from './timetable';
import { delayOf, runStatus, transferAtRisk, type RTState } from './live';

export interface Alarm {
  id: string;
  from: string; to: string;
  mode: 'arrive' | 'depart';  // llegar antes de / salir después de (hora de salida del tren)
  time: number;               // minutos desde las 00:00
  days: number[];             // 0 = lunes … 6 = domingo
  walk: number;               // minutos a pie hasta la estación
  notify: 0 | 5 | 10 | 15;    // avisar X min antes de salir de casa
  on: boolean;
}

export interface Plan {
  date: string;        // YYYYMMDD del viaje
  journey: Journey;
  delayDep: number;    // retraso del primer tren (min)
  delayArr: number;    // retraso del último tren
  dep: number; arr: number;   // horas reales (con retraso)
  leaveAt: number;     // salir de casa
  notifyAt: number;    // aviso
  risk: boolean;       // transbordo en riesgo
}

export const weekday = (ymd: string) => (new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8))).getUTCDay() + 6) % 7;

/** Mejor tren para una alarma en una fecha. Descarta cancelados; suma el retraso real si la fecha es hoy. */
export function planFor(tt: Timetable, a: Pick<Alarm, 'from' | 'to' | 'mode' | 'time' | 'walk' | 'notify'>, date: string, rt: RTState, today: string, nowMin: number): Plan | null {
  if (a.from === a.to) return null;
  const after = a.mode === 'arrive' ? a.time - 240 : a.time - 60; // margen para trenes que salen tarde por retraso
  const js = search(tt, a.from, a.to, date, after, { windowMin: a.mode === 'arrive' ? 240 : 240, limit: 200 });
  const plans: Plan[] = [];
  for (const j of js) {
    const sts = j.legs.map((l) => runStatus(l.run, rt, date, today, nowMin));
    if (sts.some((s) => s.kind === 'canceled')) continue;
    const ds = sts.map(delayOf);
    const dep = j.dep + ds[0], arr = j.arr + ds[ds.length - 1];
    const risk = j.legs.length > 1 && transferAtRisk(j.legs[0].run.arr[j.legs[0].to], ds[0], j.legs[1].run.dep[j.legs[1].from], ds[1]);
    plans.push({ date, journey: j, delayDep: ds[0], delayArr: ds[ds.length - 1], dep, arr, leaveAt: dep - a.walk, notifyAt: dep - a.walk - a.notify, risk });
  }
  const ok = plans.filter((p) => !p.risk);
  if (a.mode === 'arrive') {
    // El último que llega a tiempo; a igual salida, el que llega antes y con menos transbordos
    return ok.filter((p) => p.arr <= a.time).sort((x, y) => y.dep - x.dep || x.arr - y.arr || x.journey.transfers - y.journey.transfers)[0] ?? null;
  }
  // El primero que sale a partir de la hora; a igual salida, el que llega antes
  return ok.filter((p) => p.dep >= a.time).sort((x, y) => x.dep - y.dep || x.arr - y.arr || x.journey.transfers - y.journey.transfers)[0] ?? null;
}

/**
 * Próximo viaje de la alarma: hoy si toca y aún no ha pasado la hora de salir de casa; si no, el siguiente día marcado.
 * Devuelve el plan, o `{ date, plan: null }` si ese día no hay tren (p. ej. Renfe no ha publicado horarios).
 */
export function nextPlan(tt: Timetable, a: Alarm, rt: RTState, now: { date: string; min: number }): { date: string; plan: Plan | null } | null {
  if (!a.days.length) return null;
  for (let k = 0; k < 8; k++) {
    const date = addDays(now.date, k);
    if (!a.days.includes(weekday(date))) continue;
    const plan = planFor(tt, a, date, rt, now.date, now.min);
    if (k === 0 && plan && plan.leaveAt < now.min) continue; // ya ha pasado la hora de salir hoy
    if (k === 0 && !plan) continue;
    return { date, plan };
  }
  return null;
}

export const DAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const DAY_LONG = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
export const PRESETS: { key: 'weekdays' | 'all' | 'weekend'; days: number[] }[] = [
  { key: 'weekdays', days: [0, 1, 2, 3, 4] }, { key: 'all', days: [0, 1, 2, 3, 4, 5, 6] }, { key: 'weekend', days: [5, 6] },
];
