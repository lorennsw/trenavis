import { useMemo } from 'react';
import { useApp } from '../context';
import { alertsForLine, lineState, trainsOnLine, type TrainOnLine } from '../core/live';
import { runsOn } from '../core/timetable';
import { t, type Key } from '../i18n';
import { Sheet } from './Sheet';
import { LineChip } from './LineChip';

interface Props { lineId: string; dir: number; onDir: (d: number) => void; onClose: () => void }

/** Línea en directo: estado, avisos y diagrama vertical con los trenes que circulan ahora en un sentido. */
export function LineSheet({ lineId, dir, onDir, onClose }: Props) {
  const { tt, rt, now, openTrain, openMap } = useApp();
  const line = tt.lines.get(lineId);
  const runs = useMemo(() => runsOn(tt, now.date), [tt, now.date]);
  if (!line) return null;
  const seqs = line.stations;
  const d = Math.min(dir, seqs.length - 1);
  const seq = seqs[d] ?? [];
  const name = (id: string) => tt.stations.get(id)?.name ?? id;
  const trains = trainsOnLine(runs, line, seq, rt, now.date, now.date, now.min);
  const state = lineState(line, rt, runs);
  const alerts = alertsForLine(line, rt.alerts);
  const at = (i: number, between: boolean) => trains.filter((x) => x.index === i && x.between === between);

  const chips = (list: TrainOnLine[]) => list.map((x) => (
    <button key={x.run.key} className="tchip" onClick={() => openTrain(x.run, now.date)}
      aria-label={`${t('common.train', { n: x.run.num })}${x.delay ? `, ${t('status.lateLong', { m: x.delay })}` : ''}, ${x.source === 'gps' ? t('line.gps') : t('line.est')}`}>
      🚆 {x.run.num}{x.delay > 0 && <span className="st-late"> +{x.delay}</span>}
    </button>
  ));

  return (
    <Sheet title={<><LineChip id={lineId} /> {t('line.live')}</>} onClose={onClose}>
      <p className={`lstate ${state}`}><b>{t(`line.state.${state}` as Key)}</b>{rt.updatedAt && !rt.stale && <> · {t('rt.updated', { t: new Date(rt.updatedAt * 1000).toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' }) })}</>}</p>
      {rt.stale && <p className="hint">{t('rt.stale')}</p>}
      {alerts.map((a) => <p key={a.id} className="alertbox" role="note">{a.text.es}</p>)}

      {seqs.length > 1 && (
        <div className="seg" role="group" style={{ marginTop: 10 }}>
          {seqs.map((s, i) => <button key={i} aria-pressed={i === d} onClick={() => onDir(i)}>{t('line.towards', { s: name(s[s.length - 1]) })}</button>)}
        </div>
      )}
      <p className="sub" style={{ margin: '12px 0 0' }} role="status">{trains.length ? t('line.count', { n: trains.length }) : t('line.none')}</p>

      <ol className="stops linediag" aria-label={t('line.stations')}>
        {seq.map((s, i) => {
          const here = at(i, false), btw = at(i, true);
          return [
            <li key={s} className={here.length ? 'here done' : ''}>
              <span className="dot" aria-hidden="true" />
              <span>{name(s)}</span>
              <span className="t tl">{chips(here)}</span>
            </li>,
            btw.length > 0 && <li key={`b${s}`} className="mov"><span /><span className="tl">{chips(btw)}</span></li>,
          ];
        })}
      </ol>
      <div className="filters actions"><button className="btn" onClick={() => openMap(lineId)}>🗺 {t('line.seeMap')}</button></div>
    </Sheet>
  );
}
