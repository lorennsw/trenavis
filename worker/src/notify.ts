/**
 * Qué avisos enviar en cada revisión (cada minuto). Lógica pura para poder probarla.
 * Horas en segundos UNIX. Retrasos en minutos.
 */
export interface PlanRow { sub_id: string; alarm_id: string; date: string; notify_at: number; lead: number; dep_at: number; trip_id: string; label: string; sent: number }
export interface FollowRow { sub_id: string; trip_id: string; dep_at: number; arr_at: number; label: string; last_delay: number; last_canceled: number; expires_at: number }
export interface TripRT { delay: number; canceled: boolean }
export interface Message { title: string; body: string; tag: string; url: string }

export interface Decision {
  sends: { sub_id: string; msg: Message }[];
  planUpdates: { sub_id: string; alarm_id: string; date: string; sent: number }[];
  followUpdates: { sub_id: string; last_delay: number; last_canceled: number }[];
  followDeletes: string[];
}

export const SENT = { pending: 0, sent: 1, canceledSent: 2, missed: 3 } as const;
const LATE_WINDOW = 30 * 60;       // si el aviso se retrasa más de 30 min (cron caído), no se envía
const DELAY_STEP = 3;              // avisar si el retraso cambia 3 min o más
const ONTIME_MAX = 1;

export function hhmm(sec: number): string {
  return new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(sec * 1000));
}

export function decide(now: number, plans: PlanRow[], follows: FollowRow[], rt: Map<string, TripRT> | null): Decision {
  const d: Decision = { sends: [], planUpdates: [], followUpdates: [], followDeletes: [] };

  for (const p of plans) {
    if (p.sent !== SENT.pending) continue;
    const info = rt?.get(p.trip_id);
    const delay = Math.max(0, info?.delay ?? 0);
    if (info?.canceled) {
      if (now >= p.notify_at - 3600 && now <= p.dep_at) {
        d.sends.push({ sub_id: p.sub_id, msg: { title: `Tu tren de las ${hhmm(p.dep_at)} está cancelado`, body: `${p.label}. Abre TrenAvís para buscar otra opción.`, tag: `alarm-${p.alarm_id}`, url: '#avisos' } });
        d.planUpdates.push({ sub_id: p.sub_id, alarm_id: p.alarm_id, date: p.date, sent: SENT.canceledSent });
      }
      continue;
    }
    const due = p.notify_at + delay * 60;
    if (now < due) continue;
    if (now > due + LATE_WINDOW) { d.planUpdates.push({ sub_id: p.sub_id, alarm_id: p.alarm_id, date: p.date, sent: SENT.missed }); continue; }
    const title = p.lead > 0 ? `Sal de casa en ${p.lead} min` : '¡Sal ya de casa!';
    const body = `${p.label} · sale a las ${hhmm(p.dep_at + delay * 60)}${delay > ONTIME_MAX ? ` (+${delay} min)` : ''}`;
    d.sends.push({ sub_id: p.sub_id, msg: { title, body, tag: `alarm-${p.alarm_id}`, url: '#avisos' } });
    d.planUpdates.push({ sub_id: p.sub_id, alarm_id: p.alarm_id, date: p.date, sent: SENT.sent });
  }

  for (const f of follows) {
    if (now >= f.expires_at) { d.followDeletes.push(f.sub_id); continue; }
    const info = rt?.get(f.trip_id);
    if (!info) continue; // sin datos: no avisar
    const delay = Math.max(0, info.delay);
    if (now > f.arr_at + delay * 60 + 30 * 60) { d.followDeletes.push(f.sub_id); continue; } // ya llegó
    const was = { delay: f.last_delay, canceled: !!f.last_canceled };
    let title: string | null = null;
    if (info.canceled && !was.canceled) title = 'Tu tren está cancelado';
    else if (!info.canceled && was.canceled) title = delay > ONTIME_MAX ? `Tu tren vuelve a circular (+${delay} min)` : 'Tu tren vuelve a circular';
    else if (!info.canceled && delay <= ONTIME_MAX && was.delay > ONTIME_MAX) title = 'Tu tren vuelve a ir a su hora';
    else if (!info.canceled && delay > ONTIME_MAX && Math.abs(delay - was.delay) >= DELAY_STEP) title = `Tu tren lleva ${delay} min de retraso`;
    if (title) {
      d.sends.push({ sub_id: f.sub_id, msg: { title, body: f.label, tag: 'follow', url: '#mitren' } });
      d.followUpdates.push({ sub_id: f.sub_id, last_delay: delay, last_canceled: info.canceled ? 1 : 0 });
    }
  }
  return d;
}
