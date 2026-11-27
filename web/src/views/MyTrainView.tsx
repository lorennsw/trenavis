import { useApp } from '../context';
import { findFollowed, followPhase } from '../core/follow';
import { alertsForLine, delayOf, livePosition, runStatus } from '../core/live';
import { destination } from '../core/timetable';
import { fmt } from '../core/time';
import { platformKey } from '../core/platform';
import { t } from '../i18n';
import { LineBadge } from '../components/LineBadge';
import { StatusLabel } from '../components/StatusLabel';
import { load } from '../store';

export function MyTrainView() {
  const { tt, follow, setFollow, rt, now, openTrain, openLine, platforms } = useApp();
  if (!follow) return <p className="empty">{t('mytrain.empty')}</p>;
  const f = findFollowed(tt, follow, now.date);
  const name = (id: string) => tt.stations.get(id)?.name ?? id;
  if (!f) return (
    <div className="empty"><p>{t('follow.expired')}</p>
      <div className="filters" style={{ justifyContent: 'center' }}><a className="btn pri" href="#buscar">{t('follow.searchAgain')}</a><button className="btn sm" onClick={() => setFollow(null)}>{t('follow.stop')}</button></div></div>
  );
  const { run, a, b } = f;
  const st = runStatus(run, rt, now.date, now.date, now.min);
  const delay = delayOf(st);
  const ph = followPhase(run, a, b, now.min, delay);
  const pos = livePosition(run, rt, now.min, delay);
  const line = tt.lines.get(run.trip.l);
  const alerts = line ? alertsForLine(line, rt.alerts) : [];
  const skipped = rt.trips.get(run.trip.id)?.skipped ?? new Set<string>();
  const via = platforms[platformKey(run, follow.from)!];

  const big = st.kind === 'canceled' ? t('status.canceled')
    : ph.kind === 'before' ? (ph.min <= 0 ? t('follow.leavesNow') : t('follow.leavesIn', { m: ph.min }))
    : ph.kind === 'riding' ? (ph.min <= 1 ? t('follow.arrivesNow') : t('follow.arrivesIn', { m: ph.min }))
    : t('follow.arrived', { s: name(follow.to) });

  const time = (planned: number) => delay > 0 && st.kind !== 'canceled'
    ? <><span className="strike"><span className="sr">{t('time.planned')} </span>{fmt(planned)}</span> <span className="real"><span className="sr">{t('time.real')} </span>{fmt(planned + delay)}</span></>
    : st.kind === 'canceled' ? <span className="strike">{fmt(planned)}</span> : fmt(planned);

  return (
    <>
      <section className="hero" aria-live="polite">
        <div className="hero-top"><LineBadge id={run.trip.l} /><div><b>{t('common.train', { n: run.num })}</b><br /><span className="rmut">{t('common.direction', { d: name(destination(run)) })}</span></div></div>
        <p className="big">{big}</p>
        <p><StatusLabel s={st} long />{via && <> · <span className="vianote">{t('platform.yoursAt', { v: via, s: name(follow.from) })}</span></>}</p>
        {st.kind === 'canceled' && <p className="warnbox" role="alert">{t('follow.canceled')}</p>}
        {rt.stale && <p className="hint">{t('rt.stale')}</p>}
      </section>

      {!load('notif', { follow: false, alarms: false }).follow && <p className="hint"><a href="#mas">{t('notif.hintFollow')}</a></p>}
      {alerts.map((al) => <p key={al.id} className="alertbox" role="note"><b>{t('alerts.follow')}:</b> {al.text.es}</p>)}

      <ol className="stops" aria-label={t('train.stops')}>
        {run.stations.slice(a, b + 1).map((s, k) => {
          const i = a + k;
          const done = pos.started && i <= pos.cur;
          const here = done && i === pos.cur && pos.atStation;
          const cls = [done && 'done', here && 'here', 'ride'].filter(Boolean).join(' ');
          return [
            <li key={s} className={cls} aria-current={here ? 'location' : undefined}>
              <span className="dot" aria-hidden="true" />
              <span>{name(s)}{i === a && <span className="key">{t('train.board')}</span>}{i === b && <span className="key">{t('train.alight')}</span>}{skipped.has(s) && <span className="key bad">{t('status.skipped')}</span>}</span>
              <span className="t">{time(i === a ? run.dep[i] : run.arr[i])}</span>
            </li>,
            pos.started && !pos.atStation && i === pos.cur && i < b && <li key={`m${i}`} className="mov done" aria-hidden="true"><span /><span /></li>,
          ];
        })}
      </ol>

      <div className="filters actions">
        <button className="btn" onClick={() => openTrain(run, now.date, follow.from, follow.to)}>{t('follow.full')}</button>
        <button className="btn" onClick={() => openLine(run.trip.l, 0)}>{t('follow.line')}</button>
        <button className="btn sm danger" onClick={() => setFollow(null)}>{t('follow.stop')}</button>
      </div>
    </>
  );
}
