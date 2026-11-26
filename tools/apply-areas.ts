/**
 * Añade a data/out/stations.json el municipio y la provincia de OpenStreetMap guardados por el workflow mensual
 * (clave "station-areas" del Worker). Si no hay, se quedan los datos de Renfe.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Station } from '../shared/types.ts';

const outDir = process.argv[2] ?? 'data/out';
const API = process.env.API_URL ?? 'https://trenavis-api.lorennsw.workers.dev/api';

export function applyAreas(stations: Station[], areas: Record<string, { town?: string; prov?: string }>): number {
  let n = 0;
  for (const s of stations) {
    const a = areas[s.id];
    if (a?.town) { s.town = a.town; n++; }
    if (a?.prov) s.prov = a.prov;
  }
  return n;
}

async function main() {
  const path = join(outDir, 'stations.json');
  const stations: Station[] = JSON.parse(readFileSync(path, 'utf8'));
  let areas: Record<string, { town?: string; prov?: string }> | null = null;
  const local = join(outDir, 'station-areas.json');
  if (existsSync(local)) areas = JSON.parse(readFileSync(local, 'utf8'));
  else {
    try {
      const r = await fetch(`${API}/station-areas`, { signal: AbortSignal.timeout(20000) });
      if (r.ok) areas = (await r.json()) as typeof areas;
    } catch { /* sin datos de OSM */ }
  }
  if (!areas) { console.log('Sin municipios de OSM: se usan los de Renfe.'); return; }
  const n = applyAreas(stations, areas);
  writeFileSync(path, JSON.stringify(stations));
  console.log(`Municipios de OSM aplicados: ${n}/${stations.length}`);
}

if (process.argv[1]?.endsWith('apply-areas.ts')) main();
