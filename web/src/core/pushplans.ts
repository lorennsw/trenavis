/**
 * Qué se manda al servidor para los avisos con la app cerrada: los próximos viajes de cada alarma (hoy y mañana)
 * y el tren seguido. Lo usan la app y la planificación diaria (GitHub Actions).
 */
import { planFor, weekday, type Alarm } from './alarms';
import { EMPTY_RT } from './live';
import { addDays, fmt, madridToEpoch } from './time';
import type { Run, Timetable } from './timetable';

export interface PushPlan { alarmId: string; date: string; notifyAt: number; lead: number; depAt: number; tripId: string; label: string }

/** Planes de los próximos `days` días para una alarma (sin tiempo real: el servidor suma el retraso del momento). */
export function alarmPlans(tt: Timetable, a: Alarm, now: { date: string; min: number }, days = 2): PushPlan[] {
  if (!a.on) return [];
  const name = (id: string) => tt.stations.get(id)?.name ?? id;
  const out: PushPlan[] = [];
  for (let k = 0; k < days; k++) {
    const date = addDays(now.date, k);
    if (!a.days.includes(weekday(date))) continue;
    const p = planFor(tt, a, date, EMPTY_RT, now.date, now.min);
    if (!p) continue;
    if (k === 0 && p.notifyAt < now.min - 30) continue; // ya pasó
    const leg = p.journey.legs[0];
    const via = p.journey.transfers ? ` (transbordo en ${name(p.journey.transferStation!)})` : '';
    out.push({
      alarmId: a.id, date, lead: a.notify,
      notifyAt: madridToEpoch(date, p.notifyAt), depAt: madridToEpoch(date, p.dep),
      tripId: leg.run.trip.id,
      label: `${leg.run.trip.l} de las ${fmt(p.dep)} · ${name(a.from)} → ${name(a.to)}${via}`,
    });
  }
  return out;
}

/** Datos del tren seguido para el servidor. `date` es la fecha de "hoy" en la que se consultó el run. */
export function followPayload(tt: Timetable, run: Run, from: string, to: string, date: string, delay: number, canceled: boolean) {
  const name = (id: string) => tt.stations.get(id)?.name ?? id;
  const a = run.stations.indexOf(from), b = run.stations.lastIndexOf(to);
  return {
    tripId: run.trip.id,
    depAt: madridToEpoch(date, run.dep[a]), arrAt: madridToEpoch(date, run.arr[b]),
    label: `${run.trip.l} · tren ${run.num} · ${name(from)} ${fmt(run.dep[a])} → ${name(to)} ${fmt(run.arr[b])}`,
    delay, canceled,
  };
}
