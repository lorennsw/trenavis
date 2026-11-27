import type { Run } from '../core/timetable';
import { destination, origin, scheduledPosition } from '../core/timetable';
import { fmt } from '../core/time';
import { t } from '../i18n';
import { useApp } from '../context';
import { Sheet } from './Sheet';
import { LineChip } from './LineChip';
import { PlatformEditor } from './PlatformEditor';

interface Props { run: Run; date: string; from?: string; to?: string; onClose: () => void }

/** Recorrido completo de un tren, con el tramo del usuario resaltado y la posición estimada según horario. */
export function TrainSheet({ run, date, from, to, onClose }: Props) {
  const { tt, now } = useApp();
  const name = (id: string) => tt.stations.get(id)?.name ?? id;
  const a = from ? run.stations.indexOf(from) : -1;
  const b = to ? run.stations.lastIndexOf(to) : -1;
  const seg = a >= 0 && b > a;
  const today = date === now.date;
  const pos = today ? scheduledPosition(run, now.min) : null;
  const L = run.stations.length;

  let where = '';
  if (pos) {
    if (!pos.started) where = t('train.where.notStarted', { s: name(origin(run)), t: fmt(run.dep[0]) });
    else if (pos.finished) where = t('train.where.finished', { s: name(destination(run)) });
    else if (pos.atStation) where = t('train.where.at', { s: name(run.stations[pos.cur]) });
    else where = t('train.where.between', { a: name(run.stations[pos.cur]), b: name(run.stations[pos.cur + 1]) });
  }

  return (
    <Sheet title={<><LineChip id={run.trip.l} /> {t('common.train', { n: run.num })}</>} onClose={onClose}>
      <p className="sub" style={{ margin: 0 }}>{name(origin(run))} → {name(destination(run))}</p>
      {where && <div className="info" role="status">{where}<small>{t('train.where.note')}</small></div>}
      <ol className="stops" aria-label={t('train.stops')}>
        {run.stations.map((s, i) => {
          const done = !!pos && i <= pos.cur;
          const here = !!pos && i === pos.cur && pos.atStation;
          const cls = [done && 'done', here && 'here', seg && i >= a && i <= b && 'ride', seg && (i < a || i > b) && 'out'].filter(Boolean).join(' ');
          const time = i === 0 ? run.dep[i] : run.arr[i];
          const moving = !!pos && i === pos.cur && !pos.atStation && pos.cur < L - 1;
          return [
            <li key={s + i} className={cls} aria-current={here ? 'location' : undefined}>
              <span className="dot" aria-hidden="true" />
              <span>{name(s)}{seg && i === a && <span className="key">{t('train.board')}</span>}{seg && i === b && <span className="key">{t('train.alight')}</span>}</span>
              <span className="t">{fmt(time)}</span>
            </li>,
            moving && <li key={`m${i}`} className="mov done" aria-hidden="true"><span /><span /></li>,
          ];
        })}
      </ol>
      {(from ?? to) && <PlatformEditor run={run} station={(from ?? to)!} />}
    </Sheet>
  );
}
