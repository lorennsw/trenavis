import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context';
import { usePersisted } from '../store';
import { search, type Journey } from '../core/search';
import { destination, hasService } from '../core/timetable';
import { reachableFrom, reachableTo } from '../core/reach';
import { addDays, duration, fmt, isoToYmd, parseTypedTime, ymdToIso } from '../core/time';
import { t } from '../i18n';
import { StationPicker } from '../components/StationPicker';
import { LineChip } from '../components/LineChip';
import { LineFilter } from '../components/LineFilter';
import { platformKey } from '../core/platform';
import { delayOf, runStatus, transferAtRisk, type Status } from '../core/live';
import { StatusLabel } from '../components/StatusLabel';

export function SearchView() {
  const { tt, meta, lineIds, now, openTrain, rt } = useApp();
  const [hideCanceled, setHideCanceled] = useState(false);
  const [onlyOnTime, setOnlyOnTime] = useState(false);
  const [q, setQ] = usePersisted<{ from: string | null; to: string | null }>('search', { from: null, to: null });
  const [date, setDate] = useState(now.date);
  const [after, setAfter] = useState(now.min);
  const [timeText, setTimeText] = useState(fmt(now.min));
  const [followNow, setFollowNow] = useState(true); // mientras sea "ahora", la hora avanza sola
  const [advOpen, setAdvOpen] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [sort, setSort] = useState<'dep' | 'dur'>('dep');
  const [lines, setLines] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState(10);
  const name = (id: string) => tt.stations.get(id)?.name ?? id;

  const fromReach = useMemo(() => (q.from ? reachableFrom(tt, q.from) : null), [tt, q.from]);
  const toReach = useMemo(() => (q.to ? reachableTo(tt, q.to) : null), [tt, q.to]);

  const results = useMemo(() => {
    if (!q.from || !q.to || q.from === q.to) return null;
    // Se busca desde 60 min antes para no perder trenes que salen tarde por retraso
    const js = search(tt, q.from, q.to, date, after - 60, { lines, windowMin: 300 }).map((j) => {
      const sts = j.legs.map((l) => runStatus(l.run, rt, date, now.date, now.min));
      const ds = sts.map(delayOf);
      const canceled = sts.some((s) => s.kind === 'canceled');
      const risk = j.legs.length > 1 && transferAtRisk(j.legs[0].run.arr[j.legs[0].to], ds[0], j.legs[1].run.dep[j.legs[1].from], ds[1]);
      return { j, sts, ds, canceled, risk, realDep: j.dep + ds[0], realArr: j.arr + ds[ds.length - 1] };
    }).filter((x) => x.realDep >= after || (x.canceled && x.j.dep >= after))
      .filter((x) => !hideCanceled || !x.canceled)
      .filter((x) => !onlyOnTime || x.sts.every((s) => s.kind === 'ontime'));
    return sort === 'dur' ? js.sort((a, b) => (a.realArr - a.realDep) - (b.realArr - b.realDep) || a.realDep - b.realDep) : js.sort((a, b) => a.j.dep - b.j.dep);
  }, [tt, q.from, q.to, date, after, lines, sort, rt, now.date, now.min, hideCanceled, onlyOnTime]);

  // Si el destino elegido ya no tiene tren desde el nuevo origen, se borra
  const setFrom = (from: string) => { setQ({ from, to: q.to && reachableFrom(tt, from).has(q.to) ? q.to : null }); setShown(10); };
  const setTo = (to: string) => { setQ({ ...q, to }); setShown(10); };
  const setNow = () => { setDate(now.date); setAfter(now.min); setTimeText(fmt(now.min)); setFollowNow(true); setShowDate(false); };
  // "Ahora" sigue al reloj; en cuanto el usuario elige otra hora o día, se queda fija
  useEffect(() => { if (followNow) { setDate(now.date); setAfter(now.min); setTimeText(fmt(now.min)); } }, [followNow, now.date, now.min]);
  useEffect(() => { if (followNow && (date !== now.date || after !== now.min)) setFollowNow(false); }, [date, after]); // eslint-disable-line react-hooks/exhaustive-deps
  const isNow = followNow;
  const timeBad = parseTypedTime(timeText) === null;
  const otherDay = date !== now.date && date !== addDays(now.date, 1);

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
        <div className="when">
          <div>
            <span className="f">{t('search.when')}</span>
            <p className="whenval">{isNow ? t('search.leaveNow') : t('search.leaveAt', { d: dayLabel(date, now.date), h: fmt(after) })}</p>
          </div>
          {!isNow && <button className="btn sm" onClick={setNow}>{t('common.now')}</button>}
        </div>
        <details className="opts" open={advOpen} onToggle={(e) => setAdvOpen((e.target as HTMLDetailsElement).open)}>
          <summary>{t('search.advanced')}{(lines.size > 0 || sort === 'dur' || hideCanceled || onlyOnTime) && <b> · {[sort === 'dur' && t('search.sort.dur'), lines.size > 0 && [...lines].join(', '), hideCanceled && t('search.hideCanceled'), onlyOnTime && t('search.onlyOnTime')].filter(Boolean).join(' · ')}</b>}</summary>

          <span className="f">{t('search.date')}</span>
          <div className="filters" role="group" aria-label={t('search.date')}>
            <button className="fl" aria-pressed={date === now.date} onClick={() => setDate(now.date)}>{t('search.today')}</button>
            <button className="fl" aria-pressed={date === addDays(now.date, 1)} onClick={() => setDate(addDays(now.date, 1))}>{t('search.tomorrow')}</button>
            <button className="fl" aria-pressed={otherDay} onClick={() => setShowDate(true)}>{t('search.otherDay')}</button>
          </div>
          {(showDate || otherDay) && (
            <input aria-label={t('search.otherDay')} type="date" value={ymdToIso(date)} min={ymdToIso(meta.validFrom)} max={ymdToIso(meta.validTo)} onChange={(e) => e.target.value && setDate(isoToYmd(e.target.value))} />
          )}

          <label className="f" htmlFor="s-time">{t('search.after')}</label>
          <input id="s-time" type="text" inputMode="numeric" autoComplete="off" placeholder={t('search.timePh')} value={timeText}
            aria-invalid={timeBad} aria-describedby="s-time-help"
            onChange={(e) => { setTimeText(e.target.value); const v = parseTypedTime(e.target.value); if (v !== null) setAfter(v); }}
            onBlur={() => { const v = parseTypedTime(timeText); if (v !== null) setTimeText(fmt(v)); }} />
          <p id="s-time-help" className={timeBad ? 'hint bad' : 'hint'}>{timeBad ? t('search.timeBad') : t('search.timeHelp')}</p>

          <label className="f" htmlFor="s-sort">{t('search.sort')}</label>
          <select id="s-sort" value={sort} onChange={(e) => setSort(e.target.value as 'dep' | 'dur')}>
            <option value="dep">{t('search.sort.dep')}</option><option value="dur">{t('search.sort.dur')}</option>
          </select>
          <span className="f">{t('search.lines')}</span>
          <LineFilter all={lineIds} selected={lines} onChange={setLines} plain />
          <span className="f">{t('search.rtFilters')}</span>
          <div className="filters">
            <button className="fl" aria-pressed={hideCanceled} onClick={() => setHideCanceled(!hideCanceled)}>{t('search.hideCanceled')}</button>
            <button className="fl" aria-pressed={onlyOnTime} onClick={() => setOnlyOnTime(!onlyOnTime)}>{t('search.onlyOnTime')}</button>
          </div>
        </details>
      </section>

      <section aria-live="polite" className="results">
        {!q.from || !q.to ? <p className="empty">{t('search.pick')}</p>
          : q.from === q.to ? <p className="empty">{t('search.same')}</p>
          : !hasService(tt, date) ? <p className="empty">{t('nodata.day')}</p>
          : !results?.length ? <p className="empty">{t('search.none')}</p>
          : <>
              <h3 className="rhead">{t('search.resultsTitle', { n: results.length })}<small>{name(q.from)} → {name(q.to)}</small></h3>
              {results.slice(0, shown).map((x) => <JourneyCard key={x.j.legs.map((l) => l.run.key).join('+')} j={x.j} sts={x.sts} ds={x.ds} risk={x.risk} canceled={x.canceled} date={date} from={q.from!} to={q.to!} name={name} openTrain={openTrain} />)}
              {results.length > shown && <button className="btn wide" onClick={() => setShown(shown + 10)}>{t('common.more')}</button>}
            </>}
      </section>
    </>
  );
}

function JourneyCard({ j, sts, ds, risk, canceled, date, from, to, name, openTrain }: { j: Journey; sts: Status[]; ds: number[]; risk: boolean; canceled: boolean; date: string; from: string; to: string; name: (id: string) => string; openTrain: ReturnType<typeof useApp>['openTrain'] }) {
  const { platforms } = useApp();
  const multi = j.legs.length > 1;
  return (
    <article className={`res${canceled ? ' can' : ''}`} aria-label={`${fmt(j.dep)} → ${fmt(j.arr)}, ${duration(j.arr - j.dep)}, ${j.transfers ? t('search.transfer') : t('search.direct')}`}>
      <div className="top">
        <div className="tms">{ds[0] > 0 ? <span className="tm"><span className="strike small"><span className="sr">{t('time.planned')} </span>{fmt(j.dep)}</span> <span className="real"><span className="sr">{t('time.real')} </span>{fmt(j.dep + ds[0])}</span></span> : <span className="tm">{fmt(j.dep)}</span>}<span aria-hidden="true">→</span>{ds[ds.length - 1] > 0 ? <span className="tm real">{fmt(j.arr + ds[ds.length - 1])}</span> : <span className="tm">{fmt(j.arr)}</span>}</div>
        <span className="dur">{duration(j.arr + ds[ds.length - 1] - j.dep - ds[0])}</span>
      </div>
      <div className="meta">
        <span className={`tag ${j.transfers ? 'tag-xfer' : 'tag-direct'}`}>{j.transfers ? t('search.transfer') : t('search.direct')}</span>
        {sts.length === 1 && <StatusLabel s={sts[0]} long />}
      </div>
      {risk && <p className="warnline" role="note">⚠ {t('rt.risk')}</p>}
      {j.legs.map((l, i) => (
        <div key={l.run.key}>
          {i === 1 && <div className="xfer">↪ {t('search.transferAt', { s: name(j.transferStation!), m: j.transferWait! })}</div>}
          <div className="leg">
            <div className="legtxt">
              <div><LineChip id={l.run.trip.l} /> <b>{t('common.direction', { d: name(destination(l.run)) })}</b></div>
              {platforms[platformKey(l.run, l.run.stations[l.from])!] && <span className="vianote">{t('platform.yoursAt', { v: platforms[platformKey(l.run, l.run.stations[l.from])!], s: name(l.run.stations[l.from]) })}</span>}
              {multi && <StatusLabel s={sts[i]} long />}
              <small>{multi && <>{fmt(l.run.dep[l.from])} {name(l.run.stations[l.from])} → {fmt(l.run.arr[l.to])} {name(l.run.stations[l.to])} · </>}{t('common.train', { n: l.run.num })}</small>
            </div>
            <button className="btn sm" onClick={() => openTrain(l.run, date, i === 0 ? from : j.transferStation, i === j.legs.length - 1 ? to : j.transferStation)}>{t('common.route')}</button>
          </div>
        </div>
      ))}
    </article>
  );
}

function dayLabel(date: string, today: string): string {
  if (date === today) return t('search.today').toLowerCase();
  if (date === addDays(today, 1)) return t('search.tomorrow').toLowerCase();
  return `${t('search.onDay')} ${date.slice(6, 8)}/${date.slice(4, 6)}`;
}
