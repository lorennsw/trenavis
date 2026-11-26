/**
 * Convierte el GTFS estático de Cercanías de Renfe en JSON compacto solo con Rodalies de Catalunya.
 *
 * Uso:  tsx tools/build-gtfs.ts [carpeta-gtfs-descomprimido] [carpeta-salida]
 * Por defecto descarga el zip a data/raw y escribe en data/out.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { readCsv, toSeconds, ymdRange, weekdayOf, readSemicolonCsvLatin1, titleCaseTown, nearest } from './gtfs.ts';
import type { Station, Line, Trip, TripsFile, Meta } from '../shared/types.ts';

export const GTFS_URL = 'https://ssl.renfe.com/ftransit/Fichero_CER_FOMENTO/fomento_transit.zip';
export const STATIONS_URL = 'https://ssl.renfe.com/ftransit/Fichero_estaciones/estaciones.csv';
/** Rodalies de Catalunya = rutas cuyo route_id empieza por 51T (núcleo 4 de Cercanías). */
export const RODALIES_PREFIX = '51T';

const rawDir = process.argv[2] ?? 'data/raw';
const outDir = process.argv[3] ?? 'data/out';

async function main() {
  mkdirSync(outDir, { recursive: true });
  if (!existsSync(join(rawDir, 'stop_times.txt'))) {
    mkdirSync(rawDir, { recursive: true });
    console.log('Descargando GTFS…');
    execFileSync('curl', ['-fsSL', '--retry', '3', '-o', join(rawDir, 'gtfs.zip'), GTFS_URL], { stdio: 'inherit' });
    execFileSync('unzip', ['-oq', join(rawDir, 'gtfs.zip'), '-d', rawDir], { stdio: 'inherit' });
  }

  // Rutas
  const routes = new Map<string, { line: string; color: string }>();
  for await (const r of readCsv(join(rawDir, 'routes.txt')))
    if (r.route_id.startsWith(RODALIES_PREFIX)) routes.set(r.route_id, { line: r.route_short_name, color: r.route_color });

  // Calendario -> fechas concretas por servicio
  const serviceDates = new Map<string, string[]>();
  for await (const c of readCsv(join(rawDir, 'calendar.txt'))) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    serviceDates.set(c.service_id, ymdRange(c.start_date, c.end_date).filter((d) => c[days[weekdayOf(d)]] === '1'));
  }

  // Viajes
  const tripInfo = new Map<string, { route: string; service: string }>();
  for await (const t of readCsv(join(rawDir, 'trips.txt')))
    if (routes.has(t.route_id)) tripInfo.set(t.trip_id, { route: t.route_id, service: t.service_id });

  // Paradas de cada viaje (streaming: stop_times pesa ~276 MB)
  const stopTimes = new Map<string, { seq: number; arr: number; dep: number; stop: string }[]>();
  for await (const s of readCsv(join(rawDir, 'stop_times.txt'))) {
    if (!tripInfo.has(s.trip_id)) continue;
    let arr = stopTimes.get(s.trip_id);
    if (!arr) stopTimes.set(s.trip_id, (arr = []));
    arr.push({ seq: +s.stop_sequence, arr: toSeconds(s.arrival_time), dep: toSeconds(s.departure_time), stop: s.stop_id });
  }

  // Estaciones
  const allStops = new Map<string, Station>();
  for await (const s of readCsv(join(rawDir, 'stops.txt')))
    allStops.set(s.stop_id, { id: s.stop_id, name: s.stop_name, lat: +s.stop_lat, lon: +s.stop_lon, wc: s.wheelchair_boarding === '1' });

  // Construcción
  const problems = { tripsWithoutStopTimes: [] as string[], tripsUnder2Stops: [] as string[], nonMonotonic: [] as string[], unknownStops: new Set<string>(), nonZeroSeconds: 0 };
  type LineAcc = { services: string[][]; svcIdx: Map<string, number>; patterns: string[][]; patIdx: Map<string, number>; trips: Trip[] };
  const perLine = new Map<string, LineAcc>();
  const usedStations = new Set<string>();
  const lineMeta = new Map<string, Line>();
  const patternCount = new Map<string, Map<string, number>>(); // línea -> patrón -> nº viajes

  for (const [id, info] of tripInfo) {
    const st = stopTimes.get(id);
    if (!st) { problems.tripsWithoutStopTimes.push(id); continue; }
    if (st.length < 2) { problems.tripsUnder2Stops.push(id); continue; }
    st.sort((a, b) => a.seq - b.seq);
    const r = routes.get(info.route)!;
    let last = -1, bad = false;
    for (const x of st) {
      if (!allStops.has(x.stop)) problems.unknownStops.add(x.stop);
      if (x.arr % 60 || x.dep % 60) problems.nonZeroSeconds++;
      if (x.arr < last || x.dep < x.arr) bad = true;
      last = x.dep;
    }
    if (bad) problems.nonMonotonic.push(id);

    const L: LineAcc = perLine.get(r.line) ?? { services: [], svcIdx: new Map(), patterns: [], patIdx: new Map(), trips: [] };
    perLine.set(r.line, L);
    let si = L.svcIdx.get(info.service);
    if (si === undefined) { si = L.services.length; L.services.push(serviceDates.get(info.service) ?? []); L.svcIdx.set(info.service, si); }
    const pat = st.map((x) => x.stop);
    const key = pat.join('>');
    let pi = L.patIdx.get(key);
    if (pi === undefined) { pi = L.patterns.length; L.patterns.push(pat); L.patIdx.set(key, pi); }
    pat.forEach((s) => usedStations.add(s));
    L.trips.push({ id, l: r.line, r: info.route, s: si, p: pi, a: st.map((x) => Math.floor(x.arr / 60)), d: st.map((x) => Math.floor(x.dep / 60)) });

    const lm = lineMeta.get(r.line) ?? { id: r.line, color: r.color, routeIds: [], stations: [] };
    if (!lm.routeIds.includes(info.route)) lm.routeIds.push(info.route);
    lineMeta.set(r.line, lm);
    const pc = patternCount.get(r.line) ?? new Map();
    pc.set(key, (pc.get(key) ?? 0) + 1);
    patternCount.set(r.line, pc);
  }

  // Estaciones de cada línea: el patrón más largo de cada sentido (ida y vuelta)
  for (const [line, lm] of lineMeta) {
    const top = [...patternCount.get(line)!.entries()].sort((a, b) => b[0].split('>').length - a[0].split('>').length || b[1] - a[1]);
    const picked: string[][] = [];
    for (const [k] of top) {
      const p = k.split('>');
      if (!picked.some((q) => q[0] === p[0] || q[q.length - 1] === p[p.length - 1])) picked.push(p);
      if (picked.length === 2) break;
    }
    lm.stations = picked;
  }

  // Salida
  mkdirSync(join(outDir, 'trips'), { recursive: true });
  let nTrips = 0, minDate = '99999999', maxDate = '00000000';
  for (const [line, L] of perLine) {
    const f: TripsFile = { line, services: L.services, patterns: L.patterns, trips: L.trips };
    writeFileSync(join(outDir, 'trips', `${line}.json`), JSON.stringify(f));
    nTrips += L.trips.length;
    for (const d of L.services.flat()) { if (d < minDate) minDate = d; if (d > maxDate) maxDate = d; }
  }
  const stations = [...usedStations].filter((s) => allStops.has(s)).sort().map((s) => allStops.get(s)!);
  // Municipio y provincia desde el fichero de estaciones de Renfe; provincia de la estación más cercana si falta
  const estPath = join(rawDir, 'estaciones.csv');
  try {
    if (!existsSync(estPath)) execFileSync('curl', ['-fsSL', '--retry', '3', '-o', estPath, STATIONS_URL], { stdio: 'inherit' });
    const info = new Map(readSemicolonCsvLatin1(estPath).map((r) => [r.CODIGO, r]));
    for (const s of stations) {
      const r = info.get(s.id);
      if (r) { s.town = titleCaseTown(r.POBLACION); s.prov = titleCaseTown(r.PROVINCIA); }
    }
    const known = stations.filter((s) => s.prov);
    for (const s of stations) if (!s.prov) s.prov = nearest(s, known)?.prov;
  } catch (e) { console.warn('Sin fichero de estaciones (municipios):', (e as Error).message); }
  writeFileSync(join(outDir, 'stations.json'), JSON.stringify(stations));
  writeFileSync(join(outDir, 'lines.json'), JSON.stringify([...lineMeta.values()].sort((a, b) => a.id.localeCompare(b.id, 'es', { numeric: true }))));
  const meta: Meta = {
    generatedAt: new Date().toISOString(),
    source: GTFS_URL,
    license: 'CC BY 4.0',
    attribution: 'Datos: Renfe (data.renfe.com), licencia CC BY 4.0',
    validFrom: minDate, validTo: maxDate,
    counts: { lines: lineMeta.size, stations: stations.length, trips: nTrips },
  };
  writeFileSync(join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));

  // Datos para el informe de calidad
  const lineWeekdays: Record<string, number[]> = {};
  const dateTrips: Record<string, number> = {};
  const lineDayTrips: Record<string, Record<string, number>> = {};
  for (const [line, L] of perLine) {
    lineDayTrips[line] = {};
    for (const t of L.trips) for (const d of L.services[t.s]) { dateTrips[d] = (dateTrips[d] ?? 0) + 1; lineDayTrips[line][d] = (lineDayTrips[line][d] ?? 0) + 1; }
    const wd = [0, 0, 0, 0, 0, 0, 0];
    for (const d of new Set(L.services.flat())) wd[weekdayOf(d)]++;
    lineWeekdays[line] = wd; // nº de fechas con servicio por día de la semana
  }
  const quality = {
    meta,
    routes: routes.size,
    tripsInFeed: tripInfo.size,
    tripsKept: nTrips,
    tripsWithoutStopTimes: problems.tripsWithoutStopTimes.length,
    tripsUnder2Stops: problems.tripsUnder2Stops.length,
    tripsNonMonotonic: problems.nonMonotonic.length,
    unknownStops: [...problems.unknownStops],
    timesWithSeconds: problems.nonZeroSeconds,
    tripsPastMidnight: [...perLine.values()].reduce((n, L) => n + L.trips.filter((t) => t.a[t.a.length - 1] >= 1440).length, 0),
    lineWeekdays, dateTrips, lineDayTrips,
    lineStationCount: Object.fromEntries([...lineMeta].map(([k, v]) => [k, new Set(v.stations.flat()).size])),
  };
  writeFileSync(join(outDir, 'quality.json'), JSON.stringify(quality, null, 2));
  console.log(`OK: ${lineMeta.size} líneas, ${stations.length} estaciones, ${nTrips} viajes (${minDate}–${maxDate}) → ${outDir}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
