import { useMemo, useState } from 'react';
import { useApp } from '../context';
import { usePersisted } from '../store';
import { search, type Journey } from '../core/search';
import { destination, hasService } from '../core/timetable';
import { reachableFrom, reachableTo } from '../core/reach';
import { duration, fmt, isoToYmd, parseHHMM, ymdToIso } from '../core/time';
import { t } from '../i18n';
import { StationPicker } from '../components/StationPicker';
import { LineChip } from '../components/LineChip';
import { LineFilter } from '../components/LineFilter';

export function SearchView() {
  const { tt, meta, lineIds, now, openTrain } = useApp();
  const [q, setQ] = usePersisted<{ from: string | null; to: string | null }>('search', { from: null, to: null });
  const [date, setDate] = useState(now.date);
  const [time, setTime] = useState(fmt(now.min));
  const [sort, setSort] = useState<'dep' | 'dur'>('dep');
  const [lines, setLines] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState(10);
  const name = (id: string) => tt.stations.get(id)?.name ?? id;

  const fromReach = useMemo(() => (q.from ? reachableFrom(tt, q.from) : null), [tt, q.from]);
  const toReach = useMemo(() => (q.to ? reachableTo(tt, q.to) : null), [tt, q.to]);

  const results = useMemo(() => {
    if (!q.from || !q.to || q.from === q.to) return null;
    const js = search(tt, q.from, q.to, date, parseHHMM(time), { lines });
    return sort === 'dur' ? [...js].sort((a, b) => (a.arr - a.dep) - (b.arr - b.dep) || a.dep - b.dep) : js;
  }, [tt, q.from, q.to, date, time, lines, sort]);

  // Si el destino elegido ya no tiene tren desde el nuevo origen, se borra
  const setFrom = (from: string) => { setQ({ from, to: q.to && reachableFrom(tt, from).has(q.to) ? q.to : null }); setShown(10); };
  const setTo = (to: string) => { setQ({ ...q, to }); setShown(10); };
  const setNow = () => { setDate(now.date); setTime(fmt(now.min)); };
  const isNow = date === now.date && Math.abs(parseHHMM(time) - now.min) <= 1;

  return (
    <>
      <section className="card" aria-label={t('search.trip')}>
        <StationPicker label={t('common.from')} value={q.from} onChange={setFrom}
          reach={toReach && !q.from ? { map: toReach, note: t('picker.reachTo', { s: name(q.to!) }) } : undefined} />
        <div className="swapline">
          <button className="btn swap" onClick={() => setQ({ from: q.to, to: q.from })} aria-label={t('search.swap')} title={t('search.swap')} disabled={!q.from && !q.to}>⇅</button>
        </div>
        <StationPicker label={t('common.to')} value={q.to} onChange={setTo}
          reach={fromReach ? { map: fromReach, note: t('picker.reachFrom', { s: name(q.from!) }) } : undefined} />
      </section>

      <section className="card" aria-label={t('search.when')}>
        <div className="row">
          <div><label className="f" htmlFor="s-date">{t('search.date')}</label>
            <input id="s-date" type="date" value={ymdToIso(date)} min={ymdToIso(meta.validFrom)} max={ymdToIso(meta.validTo)} onChange={(e) => e.target.value && setDate(isoToYmd(e.target.value))} /></div>
          <div><label className="f" htmlFor="s-time">{t('search.after')}</label>
            <input id="s-time" type="time" value={time} onChange={(e) => e.target.value && setTime(e.target.value)} /></div>
        </div>
        <button className="btn wide" style={{ marginTop: 12 }} onClick={setNow} aria-pressed={isNow}>{isNow ? `✓ ${t('search.isNow')}` : t('common.now')}</button>
        <details className="opts">
          <summary>{t('search.options')}{(lines.size > 0 || sort === 'dur') && <b> · {[sort === 'dur' && t('search.sort.dur'), lines.size > 0 && [...lines].join(', ')].filter(Boolean).join(' · ')}</b>}</summary>
          <label className="f" htmlFor="s-sort">{t('search.sort')}</label>
          <select id="s-sort" value={sort} onChange={(e) => setSort(e.target.value as 'dep' | 'dur')}>
            <option value="dep">{t('search.sort.dep')}</option><option value="dur">{t('search.sort.dur')}</option>
          </select>
          <span className="f">{t('search.lines')}</span>
          <LineFilter all={lineIds} selected={lines} onChange={setLines} plain />
        </details>
      </section>

      <section aria-live="polite" className="results">
        {!q.from || !q.to ? <p className="empty">{t('search.pick')}</p>
          : q.from === q.to ? <p className="empty">{t('search.same')}</p>
          : !hasService(tt, date) ? <p className="empty">{t('nodata.day')}</p>
          : !results?.length ? <p className="empty">{t('search.none')}</p>
          : <>
              <h3 className="rhead">{t('search.resultsTitle', { n: results.length })}<small>{name(q.from)} → {name(q.to)}</small></h3>
              {results.slice(0, shown).map((j) => <JourneyCard key={j.legs.map((l) => l.run.key).join('+')} j={j} date={date} from={q.from!} to={q.to!} name={name} openTrain={openTrain} />)}
              {results.length > shown && <button className="btn wide" onClick={() => setShown(shown + 10)}>{t('common.more')}</button>}
            </>}
      </section>
    </>
  );
}

function JourneyCard({ j, date, from, to, name, openTrain }: { j: Journey; date: string; from: string; to: string; name: (id: string) => string; openTrain: ReturnType<typeof useApp>['openTrain'] }) {
  const multi = j.legs.length > 1;
  return (
    <article className="res" aria-label={`${fmt(j.dep)} → ${fmt(j.arr)}, ${duration(j.arr - j.dep)}, ${j.transfers ? t('search.transfer') : t('search.direct')}`}>
      <div className="top">
        <div className="tms"><span className="tm">{fmt(j.dep)}</span><span aria-hidden="true">→</span><span className="tm">{fmt(j.arr)}</span></div>
        <span className="dur">{duration(j.arr - j.dep)}</span>
      </div>
      <div className="meta">
        <span className={`tag ${j.transfers ? 'x' : 'd'}`}>{j.transfers ? t('search.transfer') : t('search.direct')}</span>
      </div>
      {j.legs.map((l, i) => (
        <div key={l.run.key}>
          {i === 1 && <div className="xfer">↪ {t('search.transferAt', { s: name(j.transferStation!), m: j.transferWait! })}</div>}
          <div className="leg">
            <div className="legtxt">
              <div><LineChip id={l.run.trip.l} /> <b>{t('common.direction', { d: name(destination(l.run)) })}</b></div>
              <small>{multi && <>{fmt(l.run.dep[l.from])} {name(l.run.stations[l.from])} → {fmt(l.run.arr[l.to])} {name(l.run.stations[l.to])} · </>}{t('common.train', { n: l.run.num })}</small>
            </div>
            <button className="btn sm" onClick={() => openTrain(l.run, date, i === 0 ? from : j.transferStation, i === j.legs.length - 1 ? to : j.transferStation)}>{t('common.route')}</button>
          </div>
        </div>
      ))}
    </article>
  );
}
