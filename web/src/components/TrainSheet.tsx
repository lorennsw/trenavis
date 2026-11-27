import type { Run } from '../core/timetable';
import { destination, origin } from '../core/timetable';
import { fmt } from '../core/time';
import { delayOf, livePosition, runStatus } from '../core/live';
import { t } from '../i18n';
import { useApp } from '../context';
import { Sheet } from './Sheet';
import { LineChip } from './LineChip';
import { PlatformEditor } from './PlatformEditor';
import { StatusLabel } from './StatusLabel';

interface Props { run: Run; date: string; from?: string; to?: string; onClose: () => void }

/** Recorrido completo de un tren: horas previstas y reales, posición (GPS o estimada), tu tramo y acciones. */
export function TrainSheet({ run, date, from, to, onClose }: Props) {
  const { tt, now, rt, follow, setFollow, openLine } = useApp();
  const name = (id: string) => tt.stations.get(id)?.name ?? id;
  const a = from ? run.stations.indexOf(from) : -1;
  const b = to ? run.stations.lastIndexOf(to) : -1;
  const seg = a >= 0 && b > a;
  const today = date === now.date;
  const st = runStatus(run, rt, date, now.date, now.min);
  const delay = delayOf(st);
  const canceled = st.kind === 'canceled';
  const pos = today && !canceled ? livePosition(run, rt, now.min, delay) : null;
  const skipped = rt.trips.get(run.trip.id)?.skipped ?? new Set<string>();
  const L = run.stations.length;
  const following = follow?.tripId === run.trip.id && follow.serviceDate === run.serviceDate;

  let where = '';
  if (pos) {
    if (!pos.started) where = t('train.where.notStarted', { s: name(origin(run)), t: fmt(run.dep[0] + delay) });
    else if (pos.finished) where = t('train.where.finished', { s: name(destination(run)) });
    else if (pos.atStation) where = t('train.where.at', { s: name(run.stations[pos.cur]) });
    else where = t('train.where.between', { a: name(run.stations[pos.cur]), b: name(run.stations[pos.cur + 1]) });
  }

  const time = (planned: number) => canceled ? <span className="strike">{fmt(planned)}</span>
    : delay > 0 ? <><span className="strike"><span className="sr">{t('time.planned')} </span>{fmt(planned)}</span> <span className="real"><span className="sr">{t('time.real')} </span>{fmt(planned + delay)}</span></> : fmt(planned);

  // "Voy en este": con tramo elegido; si se abre desde el panel, desde esa estación hasta el final (o desde el origen)
  const fFrom = seg ? from! : from ?? origin(run);
  const fTo = seg ? to! : (to && to !== fFrom ? to : destination(run));
  const canFollow = today && !canceled && run.stations.indexOf(fFrom) < run.stations.lastIndexOf(fTo);

  return (
    <Sheet title={<><LineChip id={run.trip.l} /> {t('common.train', { n: run.num })}</>} onClose={onClose}>
      <p className="sub" style={{ margin: 0 }}>{name(origin(run))} → {name(destination(run))} · <StatusLabel s={st} long /></p>
      {where && <div className="info" role="status">{where}<small>{pos?.source === 'gps' ? t('line.gps') : t('train.where.note')}</small></div>}
      {canceled && <p className="warnbox" role="alert">{t('status.canceled')}</p>}
      <ol className="stops" aria-label={t('train.stops')}>
        {run.stations.map((s, i) => {
          const done = !!pos && pos.started && i <= pos.cur;
          const here = done && i === pos!.cur && pos!.atStation;
          const cls = [done && 'done', here && 'here', seg && i >= a && i <= b && 'ride', seg && (i < a || i > b) && 'out'].filter(Boolean).join(' ');
          const moving = !!pos && pos.started && !pos.atStation && i === pos.cur && pos.cur < L - 1;
          return [
            <li key={s + i} className={cls} aria-current={here ? 'location' : undefined}>
              <span className="dot" aria-hidden="true" />
              <span>{name(s)}{seg && i === a && <span className="key">{t('train.board')}</span>}{seg && i === b && <span className="key">{t('train.alight')}</span>}{skipped.has(s) && <span className="key bad">{t('status.skipped')}</span>}</span>
              <span className="t">{time(i === 0 ? run.dep[i] : run.arr[i])}</span>
            </li>,
            moving && <li key={`m${i}`} className="mov done" aria-hidden="true"><span /><span /></li>,
          ];
        })}
      </ol>
      <div className="filters actions">
        {canFollow && (following
          ? <button className="btn" onClick={() => setFollow(null)}>{t('follow.following')} · {t('follow.stop')}</button>
          : <button className="btn pri" onClick={() => { setFollow({ tripId: run.trip.id, serviceDate: run.serviceDate, from: fFrom, to: fTo, savedAt: Date.now() }); onClose(); location.hash = 'mitren'; }}>{t('follow.go')}</button>)}
        <button className="btn sm" onClick={() => openLine(run.trip.l, lineDirIndex(tt.lines.get(run.trip.l)?.stations, run))}>{t('follow.line')}</button>
      </div>
      {(from ?? to) && <PlatformEditor run={run} station={(from ?? to)!} />}
    </Sheet>
  );
}

/** Índice del sentido de la línea en el que va este tren (0 si no se sabe). */
function lineDirIndex(seqs: string[][] | undefined, run: Run): number {
  if (!seqs) return 0;
  for (let d = 0; d < seqs.length; d++) {
    const pos = seqs[d].map((s) => run.stations.indexOf(s)).filter((i) => i >= 0);
    if (pos.length >= 2 && pos[1] > pos[0]) return d;
  }
  return 0;
}
