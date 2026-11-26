import { useMemo, useState } from 'react';
import type { Station } from '../../../shared/types';
import { t } from '../i18n';
import { useApp } from '../context';
import { fmtKm, nearestStations, norm } from '../core/geo';
import type { Reach } from '../core/reach';
import { Sheet } from './Sheet';
import { LineChip } from './LineChip';

const REGIONS: { id: string; provs: string[] }[] = [
  { id: 'Barcelona', provs: ['Barcelona'] }, { id: 'Girona', provs: ['Girona'] },
  { id: 'Tarragona', provs: ['Tarragona'] }, { id: 'Lleida', provs: ['Lleida'] },
  { id: 'Aragón', provs: ['Zaragoza', 'Huesca', 'Teruel'] },
];

interface Props {
  label: string;
  value: string | null;
  onChange: (id: string) => void;
  /** Si se indica, solo se muestran estas estaciones (las que tienen tren desde/hacia la otra elegida). */
  reach?: { map: Reach; note: string };
}

type Near = { item: Station; km: number }[];

/**
 * Selector de estación: busca por estación, municipio o pueblo/barrio (OpenStreetMap), por zona,
 * o por cercanía usando la ubicación del móvil (se calcula en el propio dispositivo, no se envía a ningún sitio).
 */
export function StationPicker({ label, value, onChange, reach }: Props) {
  const { stations, places, linesByStation, favorites } = useApp();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [region, setRegion] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [near, setNear] = useState<{ state: 'idle' | 'asking' | 'denied' | 'error' } | { state: 'ok'; list: Near }>({ state: 'idle' });
  const current = stations.find((s) => s.id === value);
  const restrict = reach && !showAll ? reach.map : null;
  const allowed = (s: Station) => !restrict || restrict.has(s.id);

  const sorted = useMemo(() => [...stations].sort((a, b) => a.name.localeCompare(b.name, 'es')), [stations]);
  const regions = REGIONS.filter((r) => stations.some((s) => s.prov && r.provs.includes(s.prov)));
  const nq = norm(q);

  const base = sorted.filter(allowed).filter((s) => !region || REGIONS.find((r) => r.id === region)!.provs.includes(s.prov ?? ''));
  const matches = nq ? base.filter((s) => norm(s.name).includes(nq) || (s.town && norm(s.town).includes(nq))) : base;
  const placeHits = useMemo(() => {
    if (nq.length < 3) return [];
    const ids = new Set(matches.map((s) => s.id));
    return places.filter((p) => norm(p.n).includes(nq)).slice(0, 6)
      .map((p) => ({ p, near: nearestStations(p, stations.filter(allowed), 3) }))
      .filter((x) => x.near.length && !x.near.every((n) => ids.has(n.item.id) && norm(n.item.name) === norm(x.p.n)));
  }, [nq, places, stations, restrict, matches]); // eslint-disable-line react-hooks/exhaustive-deps
  const favs = nq ? [] : favorites.map((id) => stations.find((s) => s.id === id)).filter((s): s is Station => !!s && allowed(s));

  const close = () => { setOpen(false); setQ(''); setNear({ state: 'idle' }); };
  const pick = (id: string) => { onChange(id); close(); };

  const locate = () => {
    if (!('geolocation' in navigator)) return setNear({ state: 'error' });
    setNear({ state: 'asking' });
    navigator.geolocation.getCurrentPosition(
      (pos) => setNear({ state: 'ok', list: nearestStations({ lat: pos.coords.latitude, lon: pos.coords.longitude }, stations.filter(allowed), 5, 30) }),
      (err) => setNear({ state: err.code === err.PERMISSION_DENIED ? 'denied' : 'error' }),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
  };

  const item = (s: Station, extra?: string) => (
    <li key={s.id + (extra ?? '')}>
      <button aria-current={s.id === value ? 'true' : undefined} onClick={() => pick(s.id)}>
        <span className="pn">
          <span>{s.name}</span>
          {(extra || (s.town && norm(s.town) !== norm(s.name) && !norm(s.name).includes(norm(s.town)))) && <small>{extra ?? s.town}</small>}
        </span>
        <LinesPreview ids={linesByStation.get(s.id) ?? []} />
      </button>
    </li>
  );
  const group = (title: string, list: Station[]) => list.length > 0 && (
    <section className="pgroup"><h4>{title}</h4><ul className="plist">{list.map((s) => item(s))}</ul></section>
  );

  const direct = restrict && !nq ? matches.filter((s) => restrict.get(s.id) === 'direct') : [];
  const transfer = restrict && !nq ? matches.filter((s) => restrict.get(s.id) === 'transfer') : [];

  return (
    <div className="field">
      <span className="f" id={`lbl-${label}`}>{label}</span>
      <button className="picker" aria-labelledby={`lbl-${label}`} aria-describedby={`val-${label}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span id={`val-${label}`} className={current ? '' : 'ph'}>{current?.name ?? t('picker.choose')}</span>
      </button>
      {open && (
        <Sheet title={label} onClose={close}>
          <input type="search" data-autofocus aria-label={t('picker.search')} placeholder={t('picker.search')} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />

          {reach && (
            <div className="pnote">
              <span>{showAll ? t('picker.showingAll') : reach.note}</span>
              <button className="linkbtn" onClick={() => setShowAll(!showAll)}>{showAll ? t('picker.onlyReachable') : t('picker.showAll')}</button>
            </div>
          )}

          {!nq && (
            <>
              <button className="btn sm wide" onClick={locate} disabled={near.state === 'asking'}>📍 {near.state === 'asking' ? t('picker.locating') : t('picker.near')}</button>
              {near.state === 'idle' && <p className="hint">{t('picker.nearPrivacy')}</p>}
              {near.state === 'denied' && <p className="hint" role="alert">{t('picker.nearDenied')}</p>}
              {near.state === 'error' && <p className="hint" role="alert">{t('picker.nearError')}</p>}
              {near.state === 'ok' && (near.list.length
                ? <section className="pgroup"><h4>{t('picker.nearTitle')}</h4><ul className="plist">{near.list.map((n) => item(n.item, fmtKm(n.km)))}</ul></section>
                : <p className="hint">{t('picker.nearNone')}</p>)}

              {regions.length > 1 && (
                <div className="filters" role="group" aria-label={t('picker.region')}>
                  <button className="fl" aria-pressed={!region} onClick={() => setRegion(null)}>{t('search.allLines')}</button>
                  {regions.map((r) => <button key={r.id} className="fl" aria-pressed={region === r.id} onClick={() => setRegion(r.id)}>{r.id}</button>)}
                </div>
              )}
              {!region && group(t('picker.favorites'), favs)}
            </>
          )}

          {nq && group(t('picker.stations'), matches)}
          {placeHits.map(({ p, near: ns }) => (
            <section className="pgroup" key={p.n + p.lat}>
              <h4>📍 {t('picker.nearPlace', { p: p.n })}</h4>
              <ul className="plist">{ns.map((n) => item(n.item, fmtKm(n.km)))}</ul>
            </section>
          ))}
          {nq && !matches.length && !placeHits.length && <p className="empty" role="status">{t('picker.none', { q })}</p>}

          {!nq && (restrict
            ? <>{group(t('picker.direct'), direct)}{group(t('picker.transfer'), transfer)}{!direct.length && !transfer.length && <p className="empty">{t('picker.noneReachable')}</p>}</>
            : group(region ?? t('picker.all'), matches))}
        </Sheet>
      )}
    </div>
  );
}

/** Hasta 4 líneas y "+N" para no amontonar (Sants tiene 12). */
function LinesPreview({ ids }: { ids: string[] }) {
  const shown = ids.length > 5 ? ids.slice(0, 4) : ids;
  return (
    <span className="lns" aria-hidden="true">
      {shown.map((l) => <LineChip key={l} id={l} />)}
      {ids.length > shown.length && <span className="ln more-l">+{ids.length - shown.length}</span>}
    </span>
  );
}
