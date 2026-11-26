import { createReadStream, readFileSync } from 'node:fs';
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

/** Lee un CSV con ';' y comillas en Latin-1 (el fichero de estaciones de Renfe). */
export function readSemicolonCsvLatin1(path: string): Record<string, string>[] {
  const text = new TextDecoder('latin1').decode(readFileSync(path));
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const split = (l: string) => l.split(';').map((x) => x.replace(/^"|"$/g, '').trim());
  const head = split(lines[0]);
  return lines.slice(1).map((l) => { const c = split(l); return Object.fromEntries(head.map((h, i) => [h, c[i] ?? ''])); });
}

/** "VENDRELL (EL)" -> "El Vendrell", "HOSPITALET DE LLOBREGAT (L')" -> "L'Hospitalet de Llobregat" */
export function titleCaseTown(raw: string): string {
  let s = raw.trim();
  const m = /^(.*)\s*\(([^)]+)\)$/.exec(s);
  if (m) { const art = m[2].trim(); s = art.endsWith("'") ? `${art}${m[1].trim()}` : `${art} ${m[1].trim()}`; }
  const small = new Set(['de', 'del', 'la', 'les', 'el', 'els', 'i', 'y', 'dels', 'd', 'l']);
  return s.toLowerCase().split(/(\s+|-|')/).map((w, i) =>
    i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join('')
    .replace(/\b(D|L)'(\p{L})/gu, (_, a, b) => `${a.toLowerCase() === a ? a : a}'${b.toUpperCase()}`);
}

export function distKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function nearest<T extends { lat: number; lon: number }>(p: { lat: number; lon: number }, list: T[]): T | undefined {
  let best: T | undefined, d = Infinity;
  for (const x of list) { const k = distKm(p, x); if (k < d) { d = k; best = x; } }
  return best;
}
