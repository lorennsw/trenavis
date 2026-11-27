import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadAll, type Loaded } from './api';
import { Ctx, type AppData } from './context';
import { compareLines } from './core/lines';
import { madridNow, fmt } from './core/time';
import type { Run } from './core/timetable';
import { usePersisted } from './store';
import { t, type Key } from './i18n';
import { SearchView } from './views/SearchView';
import { StationView } from './views/StationView';
import { MoreView } from './views/MoreView';
import { MyTrainView, AlarmsView } from './views/Placeholders';
import { TrainSheet } from './components/TrainSheet';

const TABS = [
  { id: 'mitren', label: 'tab.mytrain', title: 'mytrain.title', sub: 'mytrain.sub', icon: <><rect x="5" y="3" width="14" height="14" rx="3" /><path d="M5 11h14M9 21l-2-4M15 21l2-4" /></> },
  { id: 'buscar', label: 'tab.search', title: 'search.title', sub: 'search.sub', icon: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></> },
  { id: 'estacion', label: 'tab.station', title: 'station.title', sub: 'station.sub', icon: <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M7 9h6M7 13h10M12 17v3" /></> },
  { id: 'alarmas', label: 'tab.alarms', title: 'alarms.title', sub: 'alarms.sub', icon: <><circle cx="12" cy="13" r="7" /><path d="M12 9v4l2 2M5 4 3 6M19 4l2 2" /></> },
  { id: 'mas', label: 'tab.more', title: 'more.title', sub: null, icon: <path d="M4 7h16M4 12h16M4 17h16" /> },
] as const;
type TabId = (typeof TABS)[number]['id'];
const DEFAULT_TAB: TabId = 'buscar';
const tabFromHash = (): TabId => (TABS.find((x) => x.id === location.hash.slice(1))?.id ?? DEFAULT_TAB);

/** Hora de Madrid que se actualiza sola cada 15 s (las vistas abiertas se refrescan sin recargar). */
function useNow() {
  const [now, setNow] = useState(madridNow);
  useEffect(() => {
    const id = setInterval(() => setNow((p) => { const n = madridNow(); return n.min === p.min && n.date === p.date ? p : n; }), 15000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function App() {
  const [state, setState] = useState<{ s: 'loading' } | { s: 'error' } | ({ s: 'ready' } & Loaded)>({ s: 'loading' });
  const [tab, setTab] = useState<TabId>(tabFromHash);
  const [train, setTrain] = useState<{ run: Run; date: string; from?: string; to?: string } | null>(null);
  const [favorites, setFavorites] = usePersisted<string[]>('favorites', []);
  const [platforms, setPlatforms] = usePersisted<Record<string, string>>('platforms', {});
  const now = useNow();
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRoute = useRef(true);

  const load = useCallback(() => { setState({ s: 'loading' }); loadAll().then((d) => setState({ s: 'ready', ...d })).catch(() => setState({ s: 'error' })); }, []);
  useEffect(load, [load]);

  useEffect(() => {
    const on = () => setTab(tabFromHash());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  useEffect(() => {
    if (firstRoute.current) { firstRoute.current = false; return; }
    scrollTo(0, 0);
    heading.current?.focus(); // anuncia la nueva sección a los lectores de pantalla
  }, [tab]);

  const data = useMemo<AppData | null>(() => {
    if (state.s !== 'ready') return null;
    const { tt, meta, places } = state;
    const lbs = new Map<string, Set<string>>();
    for (const f of tt.files) for (const p of f.patterns) for (const s of p) { if (!lbs.has(s)) lbs.set(s, new Set()); lbs.get(s)!.add(f.line); }
    return {
      tt, meta,
      stations: [...tt.stations.values()],
      places,
      linesByStation: new Map([...lbs].map(([k, v]) => [k, [...v].sort(compareLines)])),
      lineIds: tt.files.map((f) => f.line).sort(compareLines),
      favorites,
      toggleFavorite: (id) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
      platforms,
      setPlatform: (key, value) => setPlatforms((p) => { const n = { ...p }; if (value) n[key] = value; else delete n[key]; return n; }),
      now,
      openTrain: (run, date, from, to) => setTrain({ run, date, from, to }),
    };
  }, [state, favorites, setFavorites, platforms, setPlatforms, now]);

  const cur = TABS.find((x) => x.id === tab)!;
  return (
    <>
      <header className="strip"><div className="in">
        <div><h1>{t('app.name')}</h1><small>{t('app.tagline')}</small></div>
        <div className="clock" role="timer" aria-label={t('app.clock')}>{fmt(now.min)}</div>
      </div></header>
      {state.s === 'ready' && state.offline && <div className="banner" role="status"><div className="in">{t('load.offline')}</div></div>}

      <main className="wrap">
        <h2 ref={heading} tabIndex={-1}>{t(cur.title as Key)}</h2>
        {cur.sub && <p className="sub">{t(cur.sub as Key)}</p>}
        {state.s === 'loading' && <div role="status" aria-label={t('load.loading')}>{[0, 1, 2, 3].map((i) => <div key={i} className="sk sk-row" />)}<span className="sr">{t('load.loading')}</span></div>}
        {state.s === 'error' && <div className="err" role="alert"><p>{t('load.error')}</p><button className="btn pri" onClick={load}>{t('load.retry')}</button></div>}
        {data && (
          <Ctx.Provider value={data}>
            {tab === 'mitren' && <MyTrainView />}
            {tab === 'buscar' && <SearchView />}
            {tab === 'estacion' && <StationView />}
            {tab === 'alarmas' && <AlarmsView />}
            {tab === 'mas' && <MoreView />}
            {train && <TrainSheet {...train} onClose={() => setTrain(null)} />}
          </Ctx.Provider>
        )}
      </main>

      <nav className="tabs" aria-label={t('tabs.label')}><div className="in">
        {TABS.map((x) => (
          <a key={x.id} href={`#${x.id}`} aria-current={x.id === tab ? 'page' : undefined}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{x.icon}</svg>{t(x.label as Key)}
          </a>
        ))}
      </div></nav>
    </>
  );
}
