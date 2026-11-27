import { useEffect, useRef } from 'react';
import type { AppData } from './context';
import type { Alarm } from './core/alarms';
import { alarmPlans, followPayload } from './core/pushplans';
import { findFollowed } from './core/follow';
import { delayOf, runStatus } from './core/live';
import { load } from './store';
import { NO_PREFS, syncPush, type NotifPrefs } from './push';

/** Construye lo que se manda al servidor según las preferencias de avisos. */
export function buildSyncPayload(d: AppData) {
  const prefs = load<NotifPrefs>('notif', NO_PREFS);
  const alarms = prefs.alarms ? load<Alarm[]>('alarms', []).filter((a) => a.on) : [];
  let follow = null;
  if (prefs.follow && d.follow) {
    const f = findFollowed(d.tt, d.follow, d.now.date);
    if (f) {
      const st = runStatus(f.run, d.rt, d.now.date, d.now.date, d.now.min);
      follow = followPayload(d.tt, f.run, d.follow.from, d.follow.to, d.now.date, delayOf(st), st.kind === 'canceled');
    }
  }
  return {
    follow,
    alarms: alarms.map(({ id, from, to, mode, time, days, walk, notify }) => ({ id, def: { from, to, mode, time, days, walk, notify } })),
    plans: alarms.flatMap((a) => alarmPlans(d.tt, a, d.now)),
  };
}

/** Sincroniza los avisos con el servidor al abrir la app y cada vez que cambian alarmas, tren seguido o preferencias. */
export function usePushSync(data: AppData | null) {
  const ref = useRef(data);
  ref.current = data;
  const ready = !!data;
  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      const d = ref.current;
      if (!d) return;
      const prefs = load<NotifPrefs>('notif', NO_PREFS);
      if (!prefs.follow && !prefs.alarms) return;
      const ok = await syncPush(buildSyncPayload(d));
      try { localStorage.setItem('trenavis:notifSync', JSON.stringify({ ok, at: Date.now() })); } catch { /* */ }
      dispatchEvent(new CustomEvent('trenavis-sync', { detail: ok }));
    };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(run, 1200); };
    const onStore = (e: Event) => { if (['alarms', 'follow', 'notif'].includes((e as CustomEvent).detail)) schedule(); };
    addEventListener('trenavis-store', onStore);
    schedule();
    return () => { clearTimeout(timer); removeEventListener('trenavis-store', onStore); };
  }, [ready]);
}
