import { describe, it, expect } from 'vitest';
import { makeTimetable } from '../web/src/core/timetable';
import { planFor, nextPlan, weekday, type Alarm } from '../web/src/core/alarms';
import { buildRT, EMPTY_RT } from '../web/src/core/live';
import { fmt } from '../web/src/core/time';
import type { TripsFile } from '../shared/types';

const THU = '20261126', FRI = '20261127', SAT = '20261128', MON = '20261130';
const hm = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const trip = (id: string, s: number, times: string[]) => ({ id, l: 'R1', r: 'x', s, p: 0, a: times.map(hm), d: times.map(hm) });
const files: TripsFile[] = [{ line: 'R1', services: [[THU, FRI, MON]], patterns: [['A', 'B']], trips: [
  trip('5129J10001R1', 0, ['07:30', '08:00']),
  trip('5129J10003R1', 0, ['08:00', '08:30']),
  trip('5129J10005R1', 0, ['08:30', '09:00']),
  trip('5129J10007R1', 0, ['09:00', '09:30']),
] }];
const tt = makeTimetable([], [], files);
const base: Alarm = { id: '1', from: 'A', to: 'B', mode: 'arrive', time: hm('09:00'), days: [0, 1, 2, 3, 4], walk: 10, notify: 5, on: true };

describe('mejor tren', () => {
  it('llegar antes de: el último que llega a tiempo', () => {
    const p = planFor(tt, base, FRI, EMPTY_RT, THU, 0)!;
    expect([fmt(p.dep), fmt(p.arr), fmt(p.leaveAt), fmt(p.notifyAt)]).toEqual(['08:30', '09:00', '08:20', '08:15']);
  });
  it('salir después de: el primero que sale a partir de la hora', () => {
    const p = planFor(tt, { ...base, mode: 'depart', time: hm('08:10') }, FRI, EMPTY_RT, THU, 0)!;
    expect(fmt(p.dep)).toBe('08:30');
  });
  it('con retraso real hoy: si el tren ya no llega a tiempo, elige el anterior; descarta cancelados', () => {
    const rt = buildRT([{ tripId: '5129J10005R1', delay: 300, canceled: false, stops: [] }], [], [], 1, false);
    const p = planFor(tt, base, THU, rt, THU, hm('07:00'))!;
    expect(fmt(p.dep)).toBe('08:00');
    const rt2 = buildRT([{ tripId: '5129J10005R1', delay: 120, canceled: false, stops: [] }], [], [], 1, false);
    const p2 = planFor(tt, { ...base, time: hm('09:10') }, THU, rt2, THU, hm('07:00'))!;
    expect([fmt(p2.dep), fmt(p2.leaveAt), p2.delayDep]).toEqual(['08:32', '08:22', 2]); // suma el retraso
    const rt3 = buildRT([{ tripId: '5129J10005R1', delay: 0, canceled: true, stops: [] }], [], [], 1, false);
    expect(fmt(planFor(tt, base, THU, rt3, THU, hm('07:00'))!.dep)).toBe('08:00');
  });
  it('el retraso solo se aplica al día de hoy', () => {
    const rt = buildRT([{ tripId: '5129J10005R1', delay: 300, canceled: false, stops: [] }], [], [], 1, false);
    expect(fmt(planFor(tt, base, FRI, rt, THU, hm('07:00'))!.dep)).toBe('08:30');
  });
  it('sin tren posible devuelve null', () => {
    expect(planFor(tt, { ...base, time: hm('07:50') }, FRI, EMPTY_RT, THU, 0)).toBeNull();
    expect(planFor(tt, { ...base, to: 'A' }, FRI, EMPTY_RT, THU, 0)).toBeNull();
  });
});

describe('próximo viaje', () => {
  it('hoy si aún no toca salir', () => {
    expect(nextPlan(tt, base, EMPTY_RT, { date: THU, min: hm('07:00') })!.date).toBe(THU);
  });
  it('si ya pasó la hora de salir, el siguiente día marcado', () => {
    expect(nextPlan(tt, base, EMPTY_RT, { date: THU, min: hm('08:25') })!.date).toBe(FRI);
  });
  it('salta los días no marcados (fin de semana) y avisa si ese día no hay horario', () => {
    const r = nextPlan(tt, base, EMPTY_RT, { date: FRI, min: hm('10:00') })!;
    expect(r.date).toBe(MON);
    const r2 = nextPlan(tt, { ...base, days: [5] }, EMPTY_RT, { date: FRI, min: hm('10:00') })!;
    expect(r2).toEqual({ date: SAT, plan: null });
  });
  it('sin días no hay alarma', () => { expect(nextPlan(tt, { ...base, days: [] }, EMPTY_RT, { date: THU, min: 0 })).toBeNull(); });
  it('día de la semana', () => { expect([weekday(THU), weekday(SAT), weekday(MON)]).toEqual([3, 5, 0]); });
});

import { madridToEpoch } from '../web/src/core/time';
import { alarmPlans } from '../web/src/core/pushplans';
describe('avisos para el servidor', () => {
  it('hora de Madrid a UNIX, también con cambio de hora', () => {
    expect(madridToEpoch('20261127', 8 * 60)).toBe(Date.UTC(2026, 10, 27, 7, 0) / 1000);   // invierno UTC+1
    expect(madridToEpoch('20260701', 8 * 60)).toBe(Date.UTC(2026, 6, 1, 6, 0) / 1000);     // verano UTC+2
    expect(madridToEpoch('20261127', 24 * 60 + 30)).toBe(Date.UTC(2026, 10, 27, 23, 30) / 1000); // 24:30 = 00:30 del día siguiente
    expect(madridToEpoch('20261025', 12 * 60)).toBe(Date.UTC(2026, 9, 25, 11, 0) / 1000);  // día del cambio de octubre
  });
  it('planes de hoy y mañana para una alarma activa', () => {
    const ps = alarmPlans(tt, base, { date: THU, min: hm('07:00') });
    expect(ps.map((p) => p.date)).toEqual([THU, FRI]);
    expect(ps[0]).toMatchObject({ alarmId: '1', lead: 5, tripId: '5129J10005R1', notifyAt: madridToEpoch(THU, hm('08:15')), depAt: madridToEpoch(THU, hm('08:30')) });
    expect(ps[0].label).toBe('R1 de las 08:30 · A → B');
    expect(alarmPlans(tt, { ...base, on: false }, { date: THU, min: 0 })).toEqual([]);
    expect(alarmPlans(tt, base, { date: THU, min: hm('09:00') }).map((p) => p.date)).toEqual([FRI]); // hoy ya pasó
  });
});
