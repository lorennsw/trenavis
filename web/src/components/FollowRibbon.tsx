import { useApp } from '../context';
import { findFollowed, followPhase } from '../core/follow';
import { delayOf, runStatus } from '../core/live';
import { t } from '../i18n';
import { LineChip } from './LineChip';
import { StatusLabel } from './StatusLabel';

/** Cinta fija bajo la cabecera con el tren seguido, visible en las demás pestañas. */
export function FollowRibbon() {
  const { tt, follow, rt, now } = useApp();
  if (!follow) return null;
  const f = findFollowed(tt, follow, now.date);
  if (!f) return null;
  const st = runStatus(f.run, rt, now.date, now.date, now.min);
  const ph = followPhase(f.run, f.a, f.b, now.min, delayOf(st));
  const txt = st.kind === 'canceled' ? t('status.canceled')
    : ph.kind === 'before' ? (ph.min <= 0 ? t('follow.leavesNow') : t('follow.leavesIn', { m: ph.min }))
    : ph.kind === 'riding' ? (ph.min <= 1 ? t('follow.arrivesNow') : t('follow.arrivesIn', { m: ph.min }))
    : t('follow.arrived', { s: tt.stations.get(follow.to)?.name ?? '' });
  return (
    <a className="ribbon" href="#mitren" aria-label={`${t('follow.ribbonLabel')}: ${f.run.trip.l}, ${t('common.train', { n: f.run.num })}, ${txt}`}>
      <span className="in"><LineChip id={f.run.trip.l} /> <b>{txt}</b> <span className="rmut">{t('common.train', { n: f.run.num })}</span> {st.kind !== 'scheduled' && <StatusLabel s={st} />}<span className="rgo" aria-hidden="true">›</span></span>
    </a>
  );
}
