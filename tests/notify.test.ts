import { describe, it, expect } from 'vitest';
import { decide, hhmm, SENT, type PlanRow, type FollowRow } from '../worker/src/notify';

const T0 = Date.UTC(2026, 10, 27, 7, 0) / 1000; // 08:00 en Madrid
const m = (min: number) => T0 + min * 60;
const plan = (o: Partial<PlanRow> = {}): PlanRow => ({ sub_id: 's1', alarm_id: 'a1', date: '20261127', notify_at: m(15), lead: 5, dep_at: m(30), trip_id: 'T1', label: 'R4 · Sant Vicenç → Sants', sent: 0, ...o });
const follow = (o: Partial<FollowRow> = {}): FollowRow => ({ sub_id: 's1', trip_id: 'T1', dep_at: m(0), arr_at: m(60), label: 'R4 15013', last_delay: 0, last_canceled: 0, expires_at: m(24 * 60), ...o });
const rt = (delay: number, canceled = false) => new Map([['T1', { delay, canceled }]]);

describe('avisos de alarma', () => {
  it('se envía a su hora (y no antes)', () => {
    expect(decide(m(14), [plan()], [], null).sends).toHaveLength(0);
    const d = decide(m(15), [plan()], [], null);
    expect(d.sends[0].msg).toMatchObject({ title: 'Sal de casa en 5 min', body: 'R4 · Sant Vicenç → Sants · sale a las 08:30' });
    expect(d.planUpdates[0].sent).toBe(SENT.sent);
  });
  it('se recalcula con el retraso real', () => {
    expect(decide(m(15), [plan()], [], rt(6)).sends).toHaveLength(0);
    const d = decide(m(21), [plan()], [], rt(6));
    expect(d.sends[0].msg.body).toBe('R4 · Sant Vicenç → Sants · sale a las 08:36 (+6 min)');
  });
  it('avisa una vez si el tren se cancela', () => {
    const d = decide(m(0), [plan()], [], rt(0, true));
    expect(d.sends[0].msg.title).toBe('Tu tren de las 08:30 está cancelado');
    expect(d.planUpdates[0].sent).toBe(SENT.canceledSent);
    expect(decide(m(1), [plan({ sent: SENT.canceledSent })], [], rt(0, true)).sends).toHaveLength(0);
  });
  it('no repite avisos ya enviados y descarta los muy atrasados', () => {
    expect(decide(m(16), [plan({ sent: SENT.sent })], [], null).sends).toHaveLength(0);
    const d = decide(m(50), [plan()], [], null);
    expect(d.sends).toHaveLength(0);
    expect(d.planUpdates[0].sent).toBe(SENT.missed);
  });
  it('aviso 0 = "¡Sal ya de casa!"', () => {
    expect(decide(m(15), [plan({ lead: 0 })], [], null).sends[0].msg.title).toBe('¡Sal ya de casa!');
  });
});

describe('avisos del tren seguido', () => {
  it('cambio de retraso de 3 min o más; no por cambios pequeños', () => {
    expect(decide(m(5), [], [follow()], rt(2)).sends).toHaveLength(0);
    const d = decide(m(5), [], [follow()], rt(5));
    expect(d.sends[0].msg.title).toBe('Tu tren lleva 5 min de retraso');
    expect(d.followUpdates[0]).toEqual({ sub_id: 's1', last_delay: 5, last_canceled: 0 });
    expect(decide(m(6), [], [follow({ last_delay: 5 })], rt(6)).sends).toHaveLength(0);
    expect(decide(m(7), [], [follow({ last_delay: 5 })], rt(9)).sends[0].msg.title).toBe('Tu tren lleva 9 min de retraso');
  });
  it('vuelve a su hora y cancelación', () => {
    expect(decide(m(5), [], [follow({ last_delay: 6 })], rt(0)).sends[0].msg.title).toBe('Tu tren vuelve a ir a su hora');
    expect(decide(m(5), [], [follow()], rt(0, true)).sends[0].msg.title).toBe('Tu tren está cancelado');
    expect(decide(m(6), [], [follow({ last_canceled: 1 })], rt(0, true)).sends).toHaveLength(0);
  });
  it('sin datos no avisa; se borra al caducar o al llegar', () => {
    expect(decide(m(5), [], [follow()], null).sends).toHaveLength(0);
    expect(decide(m(24 * 60), [], [follow()], null).followDeletes).toEqual(['s1']);
    expect(decide(m(95), [], [follow()], rt(0)).followDeletes).toEqual(['s1']);
  });
  it('hora en Madrid', () => { expect(hhmm(m(30))).toBe('08:30'); });
});
