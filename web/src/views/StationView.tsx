import { useMemo, useState } from 'react';
import { useApp } from '../context';
import { usePersisted } from '../store';
import { board, destination, hasService, origin } from '../core/timetable';
import { fmt } from '../core/time';
import { t } from '../i18n';
import { StationPicker } from '../components/StationPicker';
import { LineBadge } from '../components/LineBadge';
import { platformKey } from '../core/platform';
import { alertsForStation, delayOf, runStatus } from '../core/live';
import { StatusLabel } from '../components/StatusLabel';
import { LineFilter } from '../components/LineFilter';

export function StationView() {
  const { tt, linesByStation, favorites, toggleFavorite, platforms, now, openTrain, rt } = useApp();
  const [station, setStation] = usePersisted<string | null>('station', null);
  const [mode, setMode] = useState<'dep' | 'arr'>('dep');
  const [lines, setLines] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(20);
  const name = (id: string) => tt.stations.get(id)?.name ?? id;
  const isFav = !!station && favorites.includes(station);
  const stationLines = station ? linesByStation.get(station) ?? [] : [];

  // Se piden trenes desde 90 min antes para incluir los que salen tarde por retraso; se filtran por hora real
  const rows = useMemo(() => {
    if (!station) return [];
    return board(tt, station, now.date, now.min - 90, mode, limit + 60, lines)
      .map((r) => { const st = runStatus(r.run, rt, now.date, now.date, now.min); return { ...r, st, delay: delayOf(st) }; })
      .filter((r) => r.time + r.delay >= now.min - 1 || (r.st.kind === 'canceled' && r.time >= now.min - 5))
      .slice(0, limit);
  }, [tt, station, now.date, now.min, mode, limit, lines, rt]);
  const stationAlerts = station ? alertsForStation(station, stationLines.map((l) => tt.lines.get(l)!).filter(Boolean), rt.alerts) : [];

  return (
    <>
      <section className="card">
        <div className="stationrow">
          <div><StationPicker variant="hero" label={t('station.station')} value={station} onChange={(s) => { setStation(s); setLines(new Set()); setLimit(20); }} /></div>
          {station && <button className="btn icon star big" aria-pressed={isFav} aria-label={isFav ? t('station.fav.remove') : t('station.fav.add')} title={isFav ? t('station.fav.remove') : t('station.fav.add')} onClick={() => toggleFavorite(station)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" /></svg>
          </button>}
        </div>
        <div className="seg" style={{ marginTop: 16 }} role="group">
          <button aria-pressed={mode === 'dep'} onClick={() => setMode('dep')}>{t('station.dep')}</button>
          <button aria-pressed={mode === 'arr'} onClick={() => setMode('arr')}>{t('station.arr')}</button>
        </div>
        <LineFilter all={stationLines} selected={lines} onChange={setLines} />
      </section>

      {stationAlerts.length > 0 && (
        <details className="alerts"><summary>⚠ {t('alerts.station')} ({stationAlerts.length})</summary>
          {stationAlerts.map((a) => <p key={a.id} className="alertbox">{a.text.es}</p>)}</details>
      )}
      {station && rt.stale && <p className="hint" role="status">{t('rt.stale')}</p>}
      <section aria-live="polite" className="results">
        {!station ? <p className="empty">{t('station.pick')}</p>
          : !hasService(tt, now.date) ? <p className="empty">{t('nodata.day')}</p>
          : !rows.length ? <p className="empty">{t('station.none')}</p>
          : <>
              <p className="sub">{t('station.tap')} {t('platform.hint')}</p>
              <div className="pboard">
                <div className="phead" aria-hidden="true">
                  <span>{t('station.col.time')}</span><span>{mode === 'dep' ? t('station.toDest') : t('station.fromOrig')}</span><span>{t('station.col.line')}</span><span>{t('station.col.platform')}</span>
                </div>
                {rows.map((r) => {
                  const other = name(mode === 'dep' ? destination(r.run) : origin(r.run));
                  const via = platforms[platformKey(r.run, station)!];
                  return (
                    <button key={r.run.key} className={`prow${r.st.kind === 'canceled' ? ' can' : ''}`}
                      aria-label={`${fmt(r.time)}, ${r.run.trip.l}, ${mode === 'dep' ? t('station.toDest') : t('station.fromOrig')} ${other}, ${t('common.train', { n: r.run.num })}, ${r.st.kind === 'late' ? t('status.lateLong', { m: r.delay }) : r.st.kind === 'canceled' ? t('status.canceled') : r.st.kind === 'ontime' ? t('status.ontime') : t('status.scheduled')}${via ? `, ${t('platform.yours', { v: via })}` : ''}`}
                      onClick={() => openTrain(r.run, now.date, mode === 'dep' ? station : undefined, mode === 'arr' ? station : undefined)}>
                      <span className="ptm">{r.delay > 0 ? <><span className="strike">{fmt(r.time)}</span><span className="real">{fmt(r.time + r.delay)}</span></> : fmt(r.time)}</span>
                      <span className="pdst"><b>{other}</b><small>{t('common.train', { n: r.run.num })} · <StatusLabel s={r.st} /></small></span>
                      <LineBadge id={r.run.trip.l} />
                      <span className={`pvia${via ? ' set' : ''}`}>{via ? <><b>{via}</b><small>{t('platform.note')}</small></> : '–'}</span>
                    </button>
                  );
                })}
              </div>
              {rows.length >= limit && <button className="btn wide" onClick={() => setLimit(limit + 20)}>{t('common.more')}</button>}
            </>}
      </section>
    </>
  );
}
