/**
 * Informe de calidad de los datos de Rodalies a partir de data/out/quality.json
 * (generado por build-gtfs.ts) y, si hay red, del GTFS-Realtime actual.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ymdRange, weekdayOf } from './gtfs.ts';

const outDir = process.argv[2] ?? 'data/out';
const q = JSON.parse(readFileSync(join(outDir, 'quality.json'), 'utf8'));
const DAYS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const L: string[] = [];
const p = (s = '') => L.push(s);

p(`# Calidad de datos – Rodalies de Catalunya`);
p(`Generado: ${q.meta.generatedAt} · Datos del ${q.meta.validFrom} al ${q.meta.validTo}\n`);
p(`- Rutas: ${q.routes} · viajes en el feed: ${q.tripsInFeed} · viajes válidos: ${q.tripsKept}`);
p(`- Viajes sin horarios: ${q.tripsWithoutStopTimes} · con <2 paradas (descartados): ${q.tripsUnder2Stops} · horas no monótonas: ${q.tripsNonMonotonic}`);
p(`- Paradas desconocidas: ${q.unknownStops.length} · horas con segundos: ${q.timesWithSeconds} · viajes que pasan de medianoche: ${q.tripsPastMidnight}\n`);

const dates = ymdRange(q.meta.validFrom, q.meta.validTo);
const gaps = dates.filter((d) => !q.dateTrips[d]);
p(`## Calendario`);
p(`Cada servicio del feed es de un único día. Días sin ningún viaje dentro del rango: ${gaps.length ? gaps.join(', ') : 'ninguno'}.\n`);

p(`## Días con servicio por línea (nº de fechas por día de la semana)`);
p(`| Línea | ${DAYS.join(' | ')} | Estaciones | Alerta |`);
p(`|---|${DAYS.map(() => '---').join('|')}|---|---|`);
for (const [line, wd] of Object.entries<number[]>(q.lineWeekdays)) {
  const present = wd.filter((x) => x > 0).length;
  const warn = wd[5] === 0 && wd[6] === 0 ? 'sin servicio en fin de semana' : present < 7 ? 'faltan días' : '';
  p(`| ${line} | ${wd.join(' | ')} | ${q.lineStationCount[line]} | ${warn} |`);
}
p();

// Tiempo real
try {
  const get = async (n: string) => (await fetch(`https://gtfsrt.renfe.com/${n}.json`)).json() as Promise<any>;
  const [tu, vp, al] = await Promise.all([get('trip_updates'), get('vehicle_positions'), get('alerts')]);
  const rod = (id: string) => id.startsWith('51');
  const tus = tu.entity.filter((e: any) => rod(e.tripUpdate.trip.tripId));
  const vps = vp.entity.filter((e: any) => rod(e.vehicle.trip?.tripId ?? ''));
  const als = al.entity.filter((e: any) => (e.alert.informedEntity ?? []).some((i: any) => (i.routeId ?? '').trim().startsWith('51T')));
  p(`## Tiempo real (ahora)`);
  p(`- trip_updates: ${tu.entity.length} totales, ${tus.length} de Rodalies`);
  p(`- vehicle_positions: ${vp.entity.length} totales, ${vps.length} de Rodalies`);
  p(`- alertas: ${al.entity.length} totales, ${als.length} de Rodalies`);
} catch (e) {
  p(`## Tiempo real\nNo se pudo consultar: ${(e as Error).message}`);
}
console.log(L.join('\n'));
