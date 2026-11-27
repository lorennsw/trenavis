import { useMemo, useState } from 'react';
import { useApp } from '../context';
import { load } from '../store';
import { DAY_LONG, DAY_SHORT, PRESETS, nextPlan, type Alarm } from '../core/alarms';
import { reachableFrom, reachableTo } from '../core/reach';
import { duration, fmt, parseTypedTime } from '../core/time';
import { t, type Key } from '../i18n';
import { Sheet } from './Sheet';
import { StationPicker } from './StationPicker';
import { LineChip } from './LineChip';
import { dayName } from './dayName';

/** Crear o editar una alarma, con vista previa en directo del mejor tren y la hora de salir de casa. */
export function AlarmForm({ initial, onSave, onCancel }: { initial: Alarm | null; onSave: (a: Alarm) => void; onCancel: () => void }) {
  const { tt, rt, now } = useApp();
  const last = load<{ from: string | null; to: string | null }>('search', { from: null, to: null });
  const [from, setFrom] = useState<string | null>(initial?.from ?? last.from);
  const [to, setTo] = useState<string | null>(initial?.to ?? last.to);
  const [mode, setMode] = useState<Alarm['mode']>(initial?.mode ?? 'arrive');
  const [timeText, setTimeText] = useState(fmt(initial?.time ?? 9 * 60));
  const [walk, setWalk] = useState(initial?.walk ?? 10);
  const [days, setDays] = useState<number[]>(initial?.days ?? [0, 1, 2, 3, 4]);
  const [notify, setNotify] = useState<Alarm['notify']>(initial?.notify ?? 5);
  const name = (id: string) => tt.stations.get(id)?.name ?? id;
  const time = parseTypedTime(timeText);

  const draft: Alarm | null = from && to && time !== null
    ? { id: initial?.id ?? `a${Date.now()}`, from, to, mode, time, walk, days: [...days].sort(), notify, on: initial?.on ?? true } : null;
  const next = useMemo(() => (draft && from !== to ? nextPlan(tt, draft, rt, now) : null), [tt, rt, now, JSON.stringify(draft)]); // eslint-disable-line react-hooks/exhaustive-deps
  const fromReach = useMemo(() => (from ? reachableFrom(tt, from) : null), [tt, from]);
  const toReach = useMemo(() => (to ? reachableTo(tt, to) : null), [tt, to]);

  const problem = !from || !to ? t('alarms.pickStations') : from === to ? t('search.same') : time === null ? t('search.timeBad')
    : !days.length ? t('alarms.noDays') : null;
  // Se puede guardar aunque el próximo día no tenga horarios publicados: el aviso vale para los demás días
  const canSave = !problem && !!next;
  const toggleDay = (d: number) => setDays((l) => (l.includes(d) ? l.filter((x) => x !== d) : [...l, d]));
  const p = next?.plan;

  return (
    <Sheet title={initial ? t('alarms.edit') : t('alarms.new')} onClose={onCancel}>
      <StationPicker label={t('common.from')} value={from} onChange={(s) => { setFrom(s); if (to && !reachableFrom(tt, s).has(to)) setTo(null); }}
        reach={toReach && !from ? { map: toReach, note: t('picker.reachTo', { s: name(to!) }) } : undefined} />
      <StationPicker label={t('common.to')} value={to} onChange={setTo}
        reach={fromReach ? { map: fromReach, note: t('picker.reachFrom', { s: name(from!) }) } : undefined} />

      <span className="f">{t('alarms.mode')}</span>
      <div className="seg" role="group" aria-label={t('alarms.mode')}>
        <button aria-pressed={mode === 'arrive'} onClick={() => setMode('arrive')}>{t('alarms.arrive')}</button>
        <button aria-pressed={mode === 'depart'} onClick={() => setMode('depart')}>{t('alarms.depart')}</button>
      </div>

      <div className="row">
        <div>
          <label className="f" htmlFor="al-time">{mode === 'arrive' ? t('alarms.timeArrive') : t('alarms.timeDepart')}</label>
          <input id="al-time" type="text" inputMode="numeric" autoComplete="off" value={timeText} aria-invalid={time === null}
            onChange={(e) => setTimeText(e.target.value)} onBlur={() => time !== null && setTimeText(fmt(time))} placeholder={t('search.timePh')} />
        </div>
        <div>
          <label className="f" htmlFor="al-walk">{t('alarms.walk')}</label>
          <div className="stepper">
            <button className="btn sm" aria-label={t('alarms.walkLess')} onClick={() => setWalk(Math.max(0, walk - 1))}>−</button>
            <input id="al-walk" type="text" inputMode="numeric" value={walk} onChange={(e) => setWalk(Math.min(120, Math.max(0, parseInt(e.target.value.replace(/\D/g, '') || '0', 10))))} />
            <button className="btn sm" aria-label={t('alarms.walkMore')} onClick={() => setWalk(Math.min(120, walk + 1))}>+</button>
          </div>
        </div>
      </div>
      {time === null && <p className="hint bad">{t('search.timeBad')}</p>}

      <span className="f">{t('alarms.days')}</span>
      <div className="dps" role="group" aria-label={t('alarms.days')}>
        {DAY_SHORT.map((d, i) => <button key={i} className="dp" aria-pressed={days.includes(i)} aria-label={DAY_LONG[i]} onClick={() => toggleDay(i)}>{d}</button>)}
      </div>
      <div className="filters">
        {PRESETS.map((pr) => <button key={pr.key} className="fl" aria-pressed={days.length === pr.days.length && pr.days.every((d) => days.includes(d))} onClick={() => setDays(pr.days)}>{t(`alarms.preset.${pr.key}` as Key)}</button>)}
      </div>

      <label className="f" htmlFor="al-notify">{t('alarms.notify')}</label>
      <select id="al-notify" value={notify} onChange={(e) => setNotify(+e.target.value as Alarm['notify'])}>
        <option value={0}>{t('alarms.notify.0')}</option>
        {[5, 10, 15].map((n) => <option key={n} value={n}>{t('alarms.notify.n', { n })}</option>)}
      </select>

      <section className="prev" aria-live="polite" aria-label={t('alarms.preview')}>
        {problem ? <p>{problem}</p>
          : !next ? <p>{t('alarms.noTrain')}</p>
          : !p ? <p>{t('alarms.noService', { d: dayName(next.date, now.date) })}</p>
          : <>
              <p className="rmut">{t('alarms.previewFor', { d: dayName(next.date, now.date) })}</p>
              <p className="prev-big">{t('alarms.leaveAt', { t: fmt(p.leaveAt) })}</p>
              <p>{p.journey.legs.map((l) => <LineChip key={l.run.key} id={l.run.trip.l} />)} {t('alarms.trainInfo', { l: t('common.train', { n: p.journey.legs[0].run.num }), d: fmt(p.dep), a: fmt(p.arr) })} · {duration(p.arr - p.dep)}</p>
              {p.journey.transfers > 0 && <p className="rmut">{t('alarms.transfer', { s: name(p.journey.transferStation!) })}</p>}
              {p.delayDep > 0 && <p className="st-late">{t('alarms.delayNote', { m: p.delayDep })}</p>}
              <p className="rmut">{t('alarms.notifyAt')}: {fmt(p.notifyAt)}</p>
            </>}
      </section>

      <div className="filters actions">
        <button className="btn pri" disabled={!canSave} onClick={() => draft && onSave(draft)}>{t('alarms.save')}</button>
        <button className="btn" onClick={onCancel}>{t('alarms.cancel')}</button>
      </div>
    </Sheet>
  );
}
