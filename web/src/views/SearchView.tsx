import { useMemo, useState } from 'react';
import { useApp } from '../context';
import { usePersisted } from '../store';
import { search, type Journey } from '../core/search';
import { destination, hasService } from '../core/timetable';
import { duration, fmt, isoToYmd, parseHHMM, ymdToIso } from '../core/time';
import { t } from '../i18n';
import { StationPicker } from '../components/StationPicker';
import { LineChip } from '../components/LineChip';
import { LineFilter } from '../components/LineFilter';

export function SearchView() {
  const app = useApp();
  const { tt, meta, stations, linesByStation, favorites, lineIds, now, openTrain } = app;
  const [q, setQ] = usePersisted<{ from: string | null; to: string | null }>('search', { from: null, to: null });
  const [date, setDate] = useState(now.date);
  const [time, setTime] = useState(fmt(now.min));
  const [sort, setSort] = useState<'dep' | 'dur'>('dep');
  const [lines, setLines] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState(12);
  const name = (id: string) => tt.stations.get(id)?.name ?? id;

  const results = useMemo(() => {
    if (!q.from || !q.to || q.from === q.to) return null;
    const js = search(tt, q.from, q.to, date, parseHHMM(time), { lines });
    return sort === 'dur' ? [...js].sort((a, b) => (a.arr - a.dep) - (b.arr - b.dep) || a.dep - b.dep) : js;
  }, [tt, q.from, q.to, date, time, lines, sort]);

  const setNow = () => { setDate(now.date); setTime(fmt(now.min)); };
  const swap = () => setQ({ from: q.to, to: q.from });

  return (
    <>
      <StationPicker label={t('common.from')} value={q.from} onChange={(from) => { setQ({ ...q, from }); setShown(12); }} stations={stations} linesByStation={linesByStation} favorites={favorites} />
      <div className="swaprow"><button className="btn sm" onClick={swap} aria-label={t('search.swap')}>⇅ {t('search.swap').split(' ')[0]}</button></div>
      <StationPicker label={t('common.to')} value={q.to} onChange={(to) => { setQ({ ...q, to }); setShown(12); }} stations={stations} linesByStation={linesByStation} favorites={favorites} />
      <div className="row">
        <div><label className="f" htmlFor="s-date">{t('search.date')}</label>
          <input id="s-date" type="date" value={ymdToIso(date)} min={ymdToIso(meta.validFrom)} max={ymdToIso(meta.validTo)} onChange={(e) => e.target.value && setDate(isoToYmd(e.target.value))} /></div>
        <div><label className="f" htmlFor="s-time">{t('search.after')}</label>
          <input id="s-time" type="time" value={time} onChange={(e) => e.target.value && setTime(e.target.value)} /></div>
      </div>
      <div className="row">
        <div><label className="f" htmlFor="s-sort">{t('search.sort')}</label>
          <select id="s-sort" value={sort} onChange={(e) => setSort(e.target.value as 'dep' | 'dur')}>
            <option value="dep">{t('search.sort.dep')}</option><option value="dur">{t('search.sort.dur')}</option>
          </select></div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}><button className="btn" style={{ width: '100%' }} onClick={setNow}>{t('common.now')}</button></div>
      </div>
      <LineFilter all={lineIds} selected={lines} onChange={setLines} />

      <div aria-live="polite">
        {!q.from || !q.to ? <p className="empty">{t('search.pick')}</p>
          : q.from === q.to ? <p className="empty">{t('search.same')}</p>
          : !hasService(tt, date) ? <p className="empty">{t('nodata.day')}</p>
          : !results?.length ? <p className="empty">{t('search.none')}</p>
          : <>
              <p className="sub">{t('search.results', { n: results.length, from: name(q.from), to: name(q.to) })}</p>
              {results.slice(0, shown).map((j) => <JourneyCard key={j.legs.map((l) => l.run.key).join('+')} j={j} date={date} from={q.from!} to={q.to!} name={name} openTrain={openTrain} />)}
              {results.length > shown && <button className="btn more" onClick={() => setShown(shown + 12)}>{t('common.more')}</button>}
            </>}
      </div>
    </>
  );
}

function JourneyCard({ j, date, from, to, name, openTrain }: { j: Journey; date: string; from: string; to: string; name: (id: string) => string; openTrain: ReturnType<typeof useApp>['openTrain'] }) {
  return (
    <article className="res" aria-label={`${fmt(j.dep)} → ${fmt(j.arr)}, ${duration(j.arr - j.dep)}, ${j.transfers ? t('search.transfer') : t('search.direct')}`}>
      <div className="top">
        {j.legs.map((l) => <LineChip key={l.run.key} id={l.run.trip.l} />)}
        <div className="tms"><span className="tm">{fmt(j.dep)}</span>→<span className="tm">{fmt(j.arr)}</span><span>{duration(j.arr - j.dep)}</span></div>
        <span className="tag">{j.transfers ? t('search.transfer') : t('search.direct')}</span>
      </div>
      {j.legs.map((l, i) => (
        <div key={l.run.key}>
          {i === 1 && <div className="xfer">{t('search.transferAt', { s: name(j.transferStation!), m: j.transferWait! })}</div>}
          <div className="leg">
            <span>{j.legs.length > 1 && <><LineChip id={l.run.trip.l} /> {fmt(l.run.dep[l.from])}–{fmt(l.run.arr[l.to])} · </>}
              {t('common.train', { n: l.run.num })} · {t('common.direction', { d: name(destination(l.run)) })}</span>
            <button className="btn sm" onClick={() => openTrain(l.run, date, i === 0 ? from : j.transferStation, i === j.legs.length - 1 ? to : j.transferStation)}>{t('common.route')}</button>
          </div>
        </div>
      ))}
    </article>
  );
}
