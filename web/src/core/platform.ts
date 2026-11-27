/**
 * "Tu vía": notas del usuario sobre la vía habitual, guardadas solo en su dispositivo.
 * Clave = estación + línea + sentido. El sentido es la estación siguiente; si el tren termina aquí,
 * la anterior (prefijo "<"), para que llegadas y salidas del mismo sentido compartan la nota.
 */
import type { Run } from './timetable';

export type PlatformNotes = Record<string, string>;

export function platformKey(run: Run, station: string): string | null {
  const i = run.stations.indexOf(station);
  if (i < 0) return null;
  const next = run.stations[i + 1];
  const dir = next ?? `<${run.stations[i - 1] ?? ''}`;
  return `${station}|${run.trip.l}|${dir}`;
}

/** Limpia lo escrito: máximo 5 caracteres, sin espacios a los lados ("7", "3-4", "A"). Vacío = borrar. */
export function cleanPlatform(raw: string): string | null {
  const s = raw.trim().replace(/\s+/g, ' ').slice(0, 5);
  return s ? s : null;
}
