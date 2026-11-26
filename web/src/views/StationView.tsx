import { useMemo, useState } from 'react';
import { useApp } from '../context';
import { usePersisted } from '../store';
import { board, destination, hasService, origin } from '../core/timetable';
import { fmt } from '../core/time';
import { t } from '../i18n';
import { StationPicker } from '../components/StationPicker';
import { LineChip } from '../components/LineChip';
import { LineFilter } from '../components/LineFilter';

export function StationView() {
  const { tt, linesByStation, favorites, toggleFavorite, now, openTrain } = useApp();
  const [station, setStation] = usePersisted<string | null>('station', null);
  const [mode, setMode] = useState<'dep' | 'arr'>('dep');
  const [lines, setLines] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(20);
  const name = (id: string) => tt.stations.get(id)?.name ?? id;
  const isFav = !!station && favorites.includes(station);
  const stationLines = station ? linesByStation.get(station) ?? [] : [];

  const rows = useMemo(() => station ? board(tt, station, now.date, now.min - 1, mode, limit, lines) : [], [tt, station, now.date, now.min, mode, limit, lines]);

  return (
    <>
      <section className="card">
        <div className="stationrow">
          <div><StationPicker label={t('station.station')} value={station} onChange={(s) => { setStation(s); setLines(new Set()); setLimit(20); }} /></div>
          {station && <button className="btn sm icon star" aria-pressed={isFav} aria-label={isFav ? t('station.fav.remove') : t('station.fav.add')} title={isFav ? t('station.fav.remove') : t('station.fav.add')} onClick={() => toggleFavorite(station)}>{isFav ? '★' : '☆'}</button>}
        </div>
        <div className="seg" style={{ marginTop: 16 }} role="group">
          <button aria-pressed={mode === 'dep'} onClick={() => setMode('dep')}>{t('station.dep')}</button>
          <button aria-pressed={mode === 'arr'} onClick={() => setMode('arr')}>{t('station.arr')}</button>
        </div>
        <LineFilter all={stationLines} selected={lines} onChange={setLines} />
      </section>

      <section aria-live="polite" className="results">
        {!station ? <p className="empty">{t('station.pick')}</p>
          : !hasService(tt, now.date) ? <p className="empty">{t('nodata.day')}</p>
          : !rows.length ? <p className="empty">{t('station.none')}</p>
          : <>
              <p className="sub">{t('station.tap')}</p>
              <div className="board">
                {rows.map((r) => {
                  const other = mode === 'dep' ? destination(r.run) : origin(r.run);
                  return (
                    <button key={r.run.key} className="tr" onClick={() => openTrain(r.run, now.date, mode === 'dep' ? station : undefined, mode === 'arr' ? station : undefined)}>
                      <span className="tm">{fmt(r.time)}</span>
                      <span className="dst"><LineChip id={r.run.trip.l} /> {name(other)}
                        <small>{mode === 'dep' ? t('station.toDest') : t('station.fromOrig')} · {t('common.train', { n: r.run.num })}</small></span>
                      <span className="rt">{t('common.scheduled')}</span>
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
