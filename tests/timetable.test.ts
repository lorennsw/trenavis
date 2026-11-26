import { describe, it, expect } from 'vitest';
import { makeTimetable, runsOn, board, scheduledPosition, trainNumber, hasService } from '../web/src/core/timetable';
import { search } from '../web/src/core/search';
import { fmt, madridNow, addDays } from '../web/src/core/time';
import type { TripsFile } from '../shared/types';

const st = (id: string) => ({ id, name: id, lat: 0, lon: 0, wc: true });
const D = '20261126', N = '20261127';
const hm = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const trip = (id: string, l: string, s: number, p: number, times: string[]) => ({ id, l, r: 'x', s, p, a: times.map(hm), d: times.map(hm) });

// Línea R1: A-B-C-D ; línea R2: C-E ; R3: B-E (lento)
const files: TripsFile[] = [
  { line: 'R1', services: [[D], [D, N]], patterns: [['A', 'B', 'C', 'D'], ['D', 'C', 'B', 'A']], trips: [
    trip('5129J10001R1', 'R1', 0, 0, ['08:00', '08:10', '08:20', '08:30']),
    trip('5129J10003R1', 'R1', 0, 0, ['09:00', '09:10', '09:20', '09:30']),
    trip('5129J10005R1', 'R1', 1, 0, ['23:40', '23:55', '24:10', '24:25']), // pasa de medianoche, circula D y N
    trip('5129J10002R1', 'R1', 0, 1, ['08:00', '08:10', '08:20', '08:30']),
  ] },
  { line: 'R2', services: [[D]], patterns: [['C', 'E']], trips: [
    trip('5129J20001R2', 'R2', 0, 0, ['08:22', '08:35']), // transbordo de 2 min: demasiado justo
    trip('5129J20003R2', 'R2', 0, 0, ['08:26', '08:40']),
    trip('5129J20005R2', 'R2', 0, 0, ['08:50', '09:05']),
  ] },
  { line: 'R3', services: [[D]], patterns: [['B', 'E']], trips: [
    trip('5129J30001R3', 'R3', 0, 0, ['08:15', '09:30']),
  ] },
];
const tt = makeTimetable(['A', 'B', 'C', 'D', 'E'].map(st), [], files);

describe('horario por día', () => {
  it('extrae el número de tren', () => {
    expect(trainNumber('5129J15013R15')).toBe('15013');
  });
  it('incluye trenes de la víspera que pasan de medianoche con hora desplazada', () => {
    const runs = runsOn(tt, N).filter((r) => r.trip.id === '5129J10005R1');
    expect(runs).toHaveLength(2); // el del día N y el que salió el día D
    const fromPrev = runs.find((r) => r.serviceDate === D)!;
    expect(fromPrev.arr[3]).toBe(25); // 24:25 -> 00:25
    expect(fmt(fromPrev.arr[3])).toBe('00:25');
  });
  it('detecta días sin servicio', () => {
    expect(hasService(tt, D)).toBe(true);
    expect(hasService(tt, '20261201')).toBe(false);
  });
  it('panel de salidas: ordenado, desde la hora y sin trenes que terminan allí', () => {
    const rows = board(tt, 'C', D, 8 * 60, 'dep');
    expect(rows.map((r) => r.run.num)).toEqual(['10002', '10001', '20001', '20003', '20005', '10003', '10005']);
    expect(board(tt, 'D', D, 0, 'dep').map((r) => r.run.num)).toEqual(['10002']);
    expect(board(tt, 'A', D, 0, 'arr').map((r) => r.run.num)).toEqual(['10002']);
  });
  it('panel de madrugada muestra el tren de la noche anterior', () => {
    const rows = board(tt, 'D', N, 0, 'arr');
    expect(rows[0].run.num).toBe('10005');
    expect(fmt(rows[0].time)).toBe('00:25');
  });
  it('filtra por línea', () => {
    expect(board(tt, 'C', D, 0, 'dep', 30, new Set(['R2'])).every((r) => r.run.trip.l === 'R2')).toBe(true);
  });
});

describe('búsqueda de trayectos', () => {
  it('encuentra directos ordenados por salida', () => {
    const js = search(tt, 'A', 'D', D, 7 * 60);
    expect(js.map((j) => [fmt(j.dep), fmt(j.arr), j.transfers])).toEqual([['08:00', '08:30', 0], ['09:00', '09:30', 0]]);
  });
  it('solo busca dentro de la ventana; con ventana amplia incluye el que llega pasada la medianoche', () => {
    const js = search(tt, 'A', 'D', D, 23 * 60, { windowMin: 120 });
    expect(js.map((j) => [fmt(j.dep), fmt(j.arr)])).toEqual([['23:40', '00:25']]);
  });
  it('no ofrece trenes en sentido contrario', () => {
    expect(search(tt, 'D', 'A', D, 0).every((j) => j.legs[0].run.trip.id === '5129J10002R1')).toBe(true);
  });
  it('un transbordo respetando el tiempo mínimo y eligiendo la llegada más temprana', () => {
    const js = search(tt, 'A', 'E', D, 7 * 60 + 50);
    const first = js[0];
    expect(first.transfers).toBe(1);
    expect(first.transferStation).toBe('C');
    expect(first.legs[1].run.num).toBe('20003'); // no el 20001 (solo 2 min)
    expect(first.transferWait).toBe(6);
    expect(fmt(first.arr)).toBe('08:40');
  });
  it('descarta transbordos peores que otro (R3 por B llega a las 9:30)', () => {
    const js = search(tt, 'A', 'E', D, 7 * 60 + 50);
    expect(js.find((j) => j.legs[1]?.run.trip.l === 'R3')).toBeUndefined();
  });
  it('respeta el filtro de líneas', () => {
    expect(search(tt, 'A', 'E', D, 7 * 60, { lines: new Set(['R1']) })).toEqual([]);
  });
  it('origen igual a destino no devuelve nada', () => {
    expect(search(tt, 'A', 'A', D, 0)).toEqual([]);
  });
});

describe('posición según horario', () => {
  const run = runsOn(tt, D).find((r) => r.num === '10001')!;
  it('antes de salir, entre paradas, en parada y al final', () => {
    expect(scheduledPosition(run, hm('07:59')).started).toBe(false);
    expect(scheduledPosition(run, hm('08:05'))).toMatchObject({ cur: 0, atStation: false });
    expect(scheduledPosition(run, hm('08:10'))).toMatchObject({ cur: 1 });
    expect(scheduledPosition(run, hm('08:31')).finished).toBe(true);
    expect(scheduledPosition(run, hm('08:12'), 5)).toMatchObject({ cur: 0 }); // con 5 min de retraso aún no ha llegado a B
  });
});

describe('tiempo', () => {
  it('hora de Madrid independiente de la zona del dispositivo', () => {
    expect(madridNow(new Date('2026-11-26T23:30:00Z'))).toEqual({ date: '20261127', min: 30 }); // invierno UTC+1
    expect(madridNow(new Date('2026-07-01T10:00:00Z'))).toEqual({ date: '20260701', min: 720 }); // verano UTC+2
  });
  it('suma días cruzando mes y año', () => {
    expect(addDays('20261231', 1)).toBe('20270101');
    expect(addDays('20261201', -1)).toBe('20261130');
  });
});

import { reachableFrom, reachableTo } from '../web/src/core/reach';
import { nearestStations, norm, fmtKm } from '../web/src/core/geo';

describe('estaciones alcanzables', () => {
  it('desde A: directas por R1 y con transbordo por R2/R3 (solo en el sentido del tren)', () => {
    const r = reachableFrom(tt, 'A');
    expect(r.get('B')).toBe('direct');
    expect(r.get('D')).toBe('direct');
    expect(r.get('E')).toBe('transfer');
    expect(r.has('A')).toBe(false);
  });
  it('hacia E: C y B directas; A y D con transbordo', () => {
    const r = reachableTo(tt, 'E');
    expect(r.get('C')).toBe('direct');
    expect(r.get('B')).toBe('direct');
    expect(r.get('A')).toBe('transfer');
    expect(r.get('D')).toBe('transfer');
  });
  it('desde E no se llega a ninguna parte (fin de línea)', () => {
    expect(reachableFrom(tt, 'E').size).toBe(0);
  });
});

describe('geografía', () => {
  it('ordena estaciones por cercanía y respeta el radio', () => {
    const list = [{ id: 'sv', lat: 41.186, lon: 1.53 }, { id: 'cal', lat: 41.19, lon: 1.57 }, { id: 'bcn', lat: 41.38, lon: 2.14 }];
    const r = nearestStations({ lat: 41.1816, lon: 1.523 }, list);
    expect(r.map((x) => x.item.id)).toEqual(['sv', 'cal']);
    expect(fmtKm(r[0].km)).toMatch(/m$/);
  });
  it('normaliza texto para buscar', () => {
    expect(norm("Coma-ruga")).toBe(norm('coma ruga'));
    expect(norm("L'Hospitalet")).toBe('l hospitalet');
  });
});

import { parseTypedTime } from '../web/src/core/time';
describe('hora escrita a mano', () => {
  it.each([['8:30', 510], ['08:30', 510], ['8.30', 510], ['8,30', 510], ['830', 510], ['0830', 510], ['8', 480], ['17h', 1020], ['17h5', 1025], ['23:59', 1439], ['0:00', 0], ['8:3', 510]])('%s', (s, v) => {
    expect(parseTypedTime(s)).toBe(v);
  });
  it.each(['', 'abc', '24:00', '8:60', '12345', '-1'])('rechaza "%s"', (s) => expect(parseTypedTime(s)).toBeNull());
});
