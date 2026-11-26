/**
 * Enriquecimiento con OpenStreetMap (se ejecuta en GitHub Actions; Overpass no es accesible desde todas partes).
 *  1. Municipio y provincia oficiales de cada estación (límites administrativos de OSM).
 *  2. Lugares (ciudades, pueblos, barrios…) a menos de 8 km de alguna estación, para buscar por localidad.
 * Si OSM falla, no rompe nada: se quedan los datos de Renfe y no se genera places.json.
 *
 * Uso: tsx tools/build-places.ts [carpeta-salida]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { distKm } from './gtfs.ts';
import type { Station, Place } from '../shared/types.ts';

const outDir = process.argv[2] ?? 'data/out';
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const UA = 'trenavis-data-build/1.0 (+https://github.com/lorennsw/trenavis)';
const MAX_KM = 8;
const START = Date.now();
const BUDGET_MS = 8 * 60_000; // nunca más de 8 min en total: si OSM va lento, se sigue sin estos datos
const log = (m: string) => console.log(`[${Math.round((Date.now() - START) / 1000)}s] ${m}`);

async function overpass(query: string): Promise<any[]> {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const left = BUDGET_MS - (Date.now() - START);
    if (left < 5000) throw new Error('tiempo agotado');
    const url = OVERPASS[attempt % OVERPASS.length];
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(query), signal: AbortSignal.timeout(Math.min(90_000, left)) });
      if (!r.ok) throw new Error(`${url} ${r.status}`);
      return ((await r.json()) as any).elements ?? [];
    } catch (e) { last = e; log(`reintento ${attempt + 1}: ${(e as Error).message}`); await new Promise((ok) => setTimeout(ok, 3000 * (attempt + 1))); }
  }
  throw last;
}

/** Une los elementos marcador (make sid=…) con las áreas que les siguen. Exportado para tests. */
export function assignAreas(elements: any[]): Map<string, { town?: string; prov?: string }> {
  const out = new Map<string, { town?: string; prov?: string }>();
  let cur: string | null = null;
  for (const e of elements) {
    if (e.type === 'm' || e.tags?.sid) { cur = e.tags.sid; out.set(cur!, {}); continue; }
    if (!cur || e.type !== 'area') continue;
    if (e.tags?.admin_level === '8') out.get(cur)!.town = e.tags.name;
    if (e.tags?.admin_level === '6') out.get(cur)!.prov = e.tags.name;
  }
  return out;
}

/** Lugares cerca de estaciones, sin duplicados (mismo nombre a < 1 km), quitando los que se llaman igual que una estación. */
export function selectPlaces(elements: any[], stations: Station[]): Place[] {
  const stationNames = new Set(stations.map((s) => s.name.toLowerCase()));
  const out: Place[] = [];
  for (const e of elements) {
    const n: string | undefined = e.tags?.name;
    if (!n || e.lat === undefined) continue;
    const p = { n, lat: +e.lat.toFixed(5), lon: +e.lon.toFixed(5) };
    if (stationNames.has(n.toLowerCase())) continue;
    if (!stations.some((s) => distKm(s, p) <= MAX_KM)) continue;
    if (out.some((q) => q.n === n && distKm(q, p) < 1)) continue;
    out.push(p);
  }
  return out.sort((a, b) => a.n.localeCompare(b.n, 'es'));
}

async function main() {
  const path = join(outDir, 'stations.json');
  const stations: Station[] = JSON.parse(readFileSync(path, 'utf8'));

  // 1. Municipio (admin_level 8) y provincia (admin_level 6) de cada estación
  try {
    const areas = new Map<string, { town?: string; prov?: string }>();
    for (let i = 0; i < stations.length; i += 40) { // por lotes, para que cada consulta sea rápida
      const q = '[out:json][timeout:80];' + stations.slice(i, i + 40).map((s) =>
        `make m sid="${s.id}";out;is_in(${s.lat},${s.lon})->.a;area.a[boundary=administrative][admin_level~"^(6|8)$"];out tags;`).join('');
      for (const [k, v] of assignAreas(await overpass(q))) areas.set(k, v);
      log(`municipios: ${Math.min(i + 40, stations.length)}/${stations.length}`);
    }
    let n = 0;
    for (const s of stations) {
      const a = areas.get(s.id);
      if (a?.town) { s.town = a.town; n++; }
      if (a?.prov) s.prov = a.prov;
    }
    writeFileSync(path, JSON.stringify(stations));
    console.log(`Municipios de OSM: ${n}/${stations.length}`);
  } catch (e) { console.warn('OSM (municipios) no disponible, se mantienen los de Renfe:', (e as Error).message); }

  // 2. Lugares cerca de las estaciones, por trozos del mapa
  try {
    const lat = stations.map((s) => s.lat), lon = stations.map((s) => s.lon);
    const [s0, w0, n0, e0] = [Math.min(...lat) - 0.08, Math.min(...lon) - 0.1, Math.max(...lat) + 0.08, Math.max(...lon) + 0.1];
    const els: any[] = [];
    const steps = 3;
    for (let i = 0; i < steps; i++) for (let j = 0; j < steps; j++) {
      const bb = [s0 + (n0 - s0) * i / steps, w0 + (e0 - w0) * j / steps, s0 + (n0 - s0) * (i + 1) / steps, w0 + (e0 - w0) * (j + 1) / steps].map((x) => x.toFixed(4)).join(',');
      els.push(...await overpass(`[out:json][timeout:80];node["place"~"^(city|town|village|suburb|quarter|neighbourhood|hamlet)$"]["name"](${bb});out;`));
    }
    log(`lugares: ${els.length} en bruto`);
    const places = selectPlaces(els, stations);
    writeFileSync(join(outDir, 'places.json'), JSON.stringify(places));
    console.log(`Lugares de OSM: ${places.length}`);
  } catch (e) { console.warn('OSM (lugares) no disponible:', (e as Error).message); }
}

if (process.argv[1]?.endsWith('build-places.ts')) main();
