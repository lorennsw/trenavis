/** Lógica de "Mi tren": localizar el tren seguido y calcular la cuenta atrás. */
import { runsOn, type Run, type Timetable } from './timetable';

export interface FollowRef { tripId: string; serviceDate: string; from: string; to: string }

/** El tren seguido tal y como aparece en el horario de hoy (incluye trenes de la víspera pasada la medianoche). */
export function findFollowed(tt: Timetable, f: FollowRef, today: string): { run: Run; a: number; b: number } | null {
  const run = runsOn(tt, today).find((r) => r.trip.id === f.tripId && r.serviceDate === f.serviceDate);
  if (!run) return null;
  const a = run.stations.indexOf(f.from), b = run.stations.lastIndexOf(f.to);
  return a >= 0 && b > a ? { run, a, b } : null;
}

export type Phase = { kind: 'before'; min: number } | { kind: 'riding'; min: number } | { kind: 'arrived' };

/** Fase del viaje con el retraso aplicado: antes de subir (min para salir), en el tren (min para llegar) o llegado. */
export function followPhase(run: Run, a: number, b: number, nowMin: number, delay: number): Phase {
  const dep = run.dep[a] + delay, arr = run.arr[b] + delay;
  if (nowMin < dep) return { kind: 'before', min: dep - nowMin };
  if (nowMin < arr) return { kind: 'riding', min: arr - nowMin };
  return { kind: 'arrived' };
}
