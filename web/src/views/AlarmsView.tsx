import { useState } from 'react';
import { useApp } from '../context';
import { usePersisted } from '../store';
import { DAY_LONG, DAY_SHORT, nextPlan, type Alarm } from '../core/alarms';
import { fmt } from '../core/time';
import { t } from '../i18n';
import { LineChip } from '../components/LineChip';
import { Sheet } from '../components/Sheet';
import { AlarmForm } from '../components/AlarmForm';
import { dayName } from '../components/dayName';
import { load } from '../store';

export function AlarmsView() {
  const [alarms, setAlarms] = usePersisted<Alarm[]>('alarms', []);
  const [editing, setEditing] = useState<Alarm | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Alarm | null>(null);
  const save = (a: Alarm) => { setAlarms((l) => (l.some((x) => x.id === a.id) ? l.map((x) => (x.id === a.id ? a : x)) : [...l, a])); setEditing(null); };

  return (
    <>
      <button className="btn pri wide" onClick={() => setEditing('new')}>{t('alarms.add')}</button>
      {!load('notif', { follow: false, alarms: false }).alarms && <p className="hint"><a href="#mas">{t('notif.hintAlarms')}</a></p>}
      {alarms.length === 0 ? <p className="empty">{t('alarms.empty')}</p>
        : <div className="results">{alarms.map((a) => (
            <AlarmCard key={a.id} a={a} onToggle={() => setAlarms((l) => l.map((x) => (x.id === a.id ? { ...x, on: !x.on } : x)))}
              onEdit={() => setEditing(a)} onDelete={() => setDeleting(a)} />))}</div>}
      {editing && <AlarmForm initial={editing === 'new' ? null : editing} onSave={save} onCancel={() => setEditing(null)} />}
      {deleting && (
        <Sheet title={t('alarms.deleteTitle')} onClose={() => setDeleting(null)}>
          <AlarmTitle a={deleting} />
          <div className="filters actions">
            <button className="btn danger-solid" onClick={() => { setAlarms((l) => l.filter((x) => x.id !== deleting.id)); setDeleting(null); }}>{t('alarms.deleteYes')}</button>
            <button className="btn" data-autofocus onClick={() => setDeleting(null)}>{t('alarms.deleteNo')}</button>
          </div>
        </Sheet>
      )}
    </>
  );
}

function AlarmTitle({ a }: { a: Alarm }) {
  const { tt } = useApp();
  const name = (id: string) => tt.stations.get(id)?.name ?? id;
  return <h4 className="tk-title">{name(a.from)} <span aria-hidden="true">→</span><span className="sr">a</span> {name(a.to)}</h4>;
}

function AlarmCard({ a, onToggle, onEdit, onDelete }: { a: Alarm; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const { tt, rt, now, openTrain } = useApp();
  const name = (id: string) => tt.stations.get(id)?.name ?? id;
  const next = a.on ? nextPlan(tt, a, rt, now) : null;
  const p = next?.plan;
  const route = `${name(a.from)} → ${name(a.to)}`;
  const isToday = next?.date === now.date;
  const leaveIn = p && isToday ? p.leaveAt - now.min : null;
  const leg0 = p?.journey.legs[0];

  return (
    <article className={`tk${a.on ? '' : ' off'}`} aria-label={route}>
      <div className="tk-top">
        <div>
          <AlarmTitle a={a} />
          <div className="meta">{a.mode === 'arrive' ? t('alarms.metaArrive', { t: fmt(a.time) }) : t('alarms.metaDepart', { t: fmt(a.time) })} · {t('alarms.walkInfo', { w: a.walk })}</div>
          <div className="days" aria-label={`${t('alarms.days')}: ${a.days.map((d) => DAY_LONG[d]).join(', ')}`}>
            {DAY_SHORT.map((d, i) => <span key={i} aria-hidden="true" className={`d${a.days.includes(i) ? ' on' : ''}`}>{d}</span>)}
          </div>
        </div>
        <button className="sw" role="switch" aria-checked={a.on} aria-label={t('alarms.toggle', { r: route })} onClick={onToggle} />
      </div>
      {a.on && next && (
        p ? (
          <>
            <p className="tk-next">{t('alarms.next', { d: dayName(next.date, now.date) })}{leaveIn !== null && leaveIn <= 60 && <b className={leaveIn <= 0 ? 'st-late' : ''}> · {leaveIn <= 0 ? t('alarms.leaveNow') : t('alarms.leaveIn', { m: leaveIn })}</b>}</p>
            <div className="tk-bot">
              <div><small>{t('alarms.notifyAt')}</small><span className="tm">{fmt(p.notifyAt)}</span></div>
              <div><small>{t('alarms.leave')}</small><span className={`tm${p.delayDep ? ' st-late' : ''}`}>{fmt(p.leaveAt)}</span></div>
              <button className="tk-train" onClick={() => leg0 && openTrain(leg0.run, next.date, a.from, p.journey.legs.length > 1 ? p.journey.transferStation : a.to)}>
                <small>{leg0 && <LineChip id={leg0.run.trip.l} />} {t('alarms.train')}</small><span className={`tm${p.delayDep ? ' st-late' : ''}`}>{fmt(p.dep)}</span>
              </button>
            </div>
            {p.delayDep > 0 && <p className="hint tk-pad">{t('alarms.delayNote', { m: p.delayDep })}</p>}
            {p.journey.transfers > 0 && <p className="hint tk-pad">{t('alarms.transfer', { s: name(p.journey.transferStation!) })}</p>}
          </>
        ) : <p className="tk-pad hint">{t('alarms.noService', { d: dayName(next.date, now.date) })}</p>
      )}
      {a.on && !next && <p className="tk-pad hint">{t('alarms.noTrain')}</p>}
      <div className="acts">
        <button className="btn sm" onClick={onEdit}>{t('alarms.edit').split(' ')[0]}</button>
        <button className="btn sm danger" onClick={onDelete}>{t('alarms.delete')}</button>
      </div>
    </article>
  );
}
