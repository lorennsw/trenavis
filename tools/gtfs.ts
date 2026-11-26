import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

/** Parser CSV mínimo con soporte de comillas. El GTFS de Renfe rellena campos con espacios: se recortan. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  out.push(cur.trim());
  return out;
}

/** Itera un CSV como objetos (cabeceras recortadas) sin cargar el fichero entero. */
export async function* readCsv(path: string): AsyncGenerator<Record<string, string>> {
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  let head: string[] | null = null;
  for await (const raw of rl) {
    const line = raw.replace(/^﻿/, '');
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    if (!head) { head = cols; continue; }
    const o: Record<string, string> = {};
    head.forEach((h, i) => (o[h] = cols[i] ?? ''));
    yield o;
  }
}

/** "HH:MM:SS" (HH puede ser >= 24) -> segundos. */
export function toSeconds(t: string): number {
  const [h, m, s] = t.split(':').map(Number);
  return h * 3600 + m * 60 + (s || 0);
}

export function ymdRange(start: string, end: string): string[] {
  const d = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
  const out: string[] = [];
  for (let t = d(start); t <= d(end); t += 86400000) {
    const x = new Date(t);
    out.push(`${x.getUTCFullYear()}${String(x.getUTCMonth() + 1).padStart(2, '0')}${String(x.getUTCDate()).padStart(2, '0')}`);
  }
  return out;
}

export function weekdayOf(ymd: string): number { // 0 = lunes
  const x = new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8)));
  return (x.getUTCDay() + 6) % 7;
}
