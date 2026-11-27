import { useMemo } from 'react';
import { useApp } from '../context';
import { alertsForLine, lineState } from '../core/live';
import { runsOn } from '../core/timetable';
import { t, type Key } from '../i18n';
import { LineBadge } from '../components/LineBadge';
import { NotificationsSettings } from '../components/NotificationsSettings';

const ymd = (s: string) => `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`;

export function MoreView() {
  const { tt, meta, lineIds, rt, now, openLine, openMap } = useApp();
  const runs = useMemo(() => runsOn(tt, now.date), [tt, now.date]);
  const name = (id: string) => tt.stations.get(id)?.name ?? id;
  return (
    <>
      <h3>{t('more.lines')}</h3>
      {rt.stale && <p className="hint">{t('rt.stale')}</p>}
      <ul className="lines">
        {lineIds.map((id) => {
          const l = tt.lines.get(id)!;
          const state = lineState(l, rt, runs);
          const n = alertsForLine(l, rt.alerts).length;
          const seq = l.stations[0] ?? [];
          return (
            <li key={id}>
              <button className="lineh" onClick={() => openLine(id, 0)}>
                <LineBadge id={id} />
                <span className="n">{seq.length ? `${name(seq[0])} – ${name(seq[seq.length - 1])}` : id}<small className={`lstate ${state}`}><b>{t(`line.state.${state}` as Key)}</b>{n > 0 && ` · ${n} ${t('line.alerts').toLowerCase()}`}</small></span>
                <span aria-hidden="true" className="rgo">›</span>
              </button>
            </li>
          );
        })}
      </ul>
      <button className="btn wide" style={{ marginTop: 14 }} onClick={() => openMap()}>🗺 {t('map.title')}</button>
      <NotificationsSettings />
      <h3>{t('more.data')}</h3>
      <div className="menu">
        <p>{t('more.source')}</p>
        <p>{t('more.valid', { a: ymd(meta.validFrom), b: ymd(meta.validTo), u: new Date(meta.generatedAt).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'short', timeStyle: 'short' }) })}</p>
        <h4>{t('more.known')}</h4>
        <ul>{t('more.known.list').split('|').map((x) => <li key={x}>{x}</li>)}</ul>
      </div>
      <p className="note">{t('more.free')} {t('more.unofficial')}</p>
    </>
  );
}
