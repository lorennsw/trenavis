import { describe, it, expect } from 'vitest';
import { makeTimetable, runsOn } from '../web/src/core/timetable';
import { buildRT, runStatus, livePosition, directionOn, trainsOnLine, lineState, transferAtRisk, EMPTY_RT, alertsForStation } from '../web/src/core/live';
import type { TripsFile, Line } from '../shared/types';

const D = '20261126';
const hm = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const trip = (id: string, s: number, p: number, times: string[]) => ({ id, l: 'R1', r: '51T0001R1', s, p, a: times.map(hm), d: times.map(hm) });
const files: TripsFile[] = [{ line: 'R1', services: [[D]], patterns: [['A', 'B', 'C', 'D'], ['D', 'C', 'B', 'A']], trips: [
  trip('5129J10001R1', 0, 0, ['08:00', '08:10', '08:20', '08:30']),
  trip('5129J10003R1', 0, 0, ['08:15', '08:25', '08:35', '08:45']),
  trip('5129J10002R1', 0, 1, ['08:00', '08:10', '08:20', '08:30']),
  trip('5129J10005R1', 0, 0, ['12:00', '12:10', '12:20', '12:30']),
] }];
const tt = makeTimetable([], [], files);
const runs = runsOn(tt, D);
const R = (n: string) => runs.find((r) => r.num === n)!;
const line: Line = { id: 'R1', color: '', routeIds: ['51T0001R1'], stations: [['A', 'B', 'C', 'D'], ['D', 'C', 'B', 'A']] };

const rt = buildRT(
  [{ tripId: '5129J10001R1', delay: 360, canceled: false, stops: [{ stopId: 'C', skipped: true }] },
   { tripId: '5129J10003R1', delay: -2760, canceled: false, stops: [] },
   { tripId: '5129J10002R1', delay: 0, canceled: true, stops: [] }],
  [{ tripId: '5129J10001R1', lat: 0, lon: 0, stopId: 'C', status: 'INCOMING_AT' }],
  [{ id: 'a1', routeIds: ['51T0001R1'], stopIds: [], text: { es: 'Obras' } }], 1795710000, false);

describe('estado en tiempo real', () => {
  it('retraso, a su hora (retraso negativo = ruido), cancelado', () => {
    expect(runStatus(R('10001'), rt, D, D, hm('08:12'))).toEqual({ kind: 'late', min: 6 });
    expect(runStatus(R('10003'), rt, D, D, hm('08:20'))).toEqual({ kind: 'ontime' });
    expect(runStatus(R('10002'), rt, D, D, hm('08:05'))).toEqual({ kind: 'canceled' });
  });
  it('paradas saltadas', () => { expect(rt.trips.get('5129J10001R1')!.skipped.has('C')).toBe(true); });
  it('sin datos si debería circular; programado si aún no sale o es otro día', () => {
    expect(runStatus(R('10005'), rt, D, D, hm('12:05'))).toEqual({ kind: 'nodata' });
    expect(runStatus(R('10005'), rt, D, D, hm('10:00'))).toEqual({ kind: 'scheduled' });
    expect(runStatus(R('10001'), rt, D, '20261127', hm('08:12'))).toEqual({ kind: 'scheduled' });
    expect(runStatus(R('10005'), EMPTY_RT, D, D, hm('12:05'))).toEqual({ kind: 'scheduled' }); // sin feed: no alarmar
  });
});

describe('posición', () => {
  it('usa el GPS: llegando a C = entre B y C', () => {
    expect(livePosition(R('10001'), rt, hm('08:12'), 6)).toMatchObject({ cur: 1, atStation: false, source: 'gps' });
  });
  it('sin GPS estima con horario + retraso', () => {
    expect(livePosition(R('10003'), rt, hm('08:26'), 0)).toMatchObject({ cur: 1, source: 'estimate' });
  });
});

describe('línea en directo', () => {
  it('sentido de cada tren', () => {
    expect(directionOn(R('10001'), line.stations[0])).toBe(1);
    expect(directionOn(R('10002'), line.stations[0])).toBe(-1);
  });
  it('coloca los trenes del sentido elegido y omite cancelados', () => {
    const t = trainsOnLine(runs, line, line.stations[0], rt, D, D, hm('08:25'));
    expect(t.map((x) => [x.run.num, x.index, x.between])).toEqual([['10003', 1, false], ['10001', 1, true]]);
    expect(trainsOnLine(runs, line, line.stations[1], rt, D, D, hm('08:05'))).toEqual([]); // 10002 cancelado
  });
  it('estado de la línea: incidencia si hay avisos', () => {
    expect(lineState(line, rt, runs)).toBe('incident');
    expect(lineState(line, { ...rt, alerts: [] }, runs)).toBe('delays'); // 2 de 3 con retraso ≥5 o cancelado
    expect(lineState(line, { ...rt, alerts: [], stale: true }, runs)).toBe('unknown');
    expect(alertsForStation('A', [line], rt.alerts)).toHaveLength(1);
  });
});

describe('transbordos', () => {
  it('en riesgo si el retraso se come el tiempo de cambio', () => {
    expect(transferAtRisk(hm('08:30'), 0, hm('08:36'), 0)).toBe(false);
    expect(transferAtRisk(hm('08:30'), 5, hm('08:36'), 0)).toBe(true);
    expect(transferAtRisk(hm('08:30'), 5, hm('08:36'), 4)).toBe(false);
  });
});

import { findFollowed, followPhase } from '../web/src/core/follow';
describe('mi tren', () => {
  it('encuentra el tren seguido y su tramo', () => {
    const f = findFollowed(tt, { tripId: '5129J10001R1', serviceDate: D, from: 'B', to: 'D' }, D)!;
    expect([f.run.num, f.a, f.b]).toEqual(['10001', 1, 3]);
    expect(findFollowed(tt, { tripId: '5129J10001R1', serviceDate: D, from: 'D', to: 'B' }, D)).toBeNull();
    expect(findFollowed(tt, { tripId: 'X', serviceDate: D, from: 'A', to: 'B' }, D)).toBeNull();
  });
  it('cuenta atrás con retraso: antes, en el tren, llegado', () => {
    const r = R('10001'); // B 08:10, D 08:30
    expect(followPhase(r, 1, 3, hm('08:05'), 0)).toEqual({ kind: 'before', min: 5 });
    expect(followPhase(r, 1, 3, hm('08:12'), 6)).toEqual({ kind: 'before', min: 4 });
    expect(followPhase(r, 1, 3, hm('08:20'), 0)).toEqual({ kind: 'riding', min: 10 });
    expect(followPhase(r, 1, 3, hm('08:31'), 0)).toEqual({ kind: 'arrived' });
  });
});
