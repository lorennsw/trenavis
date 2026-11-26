import { useMemo, useState } from 'react';
import type { Station } from '../../../shared/types';
import { t } from '../i18n';
import { Sheet } from './Sheet';
import { LineChip } from './LineChip';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

interface Props {
  label: string;
  value: string | null;
  onChange: (id: string) => void;
  stations: Station[];
  linesByStation: Map<string, string[]>;
  favorites: string[];
}

/** Selector de estación con buscador (ignora tildes y guiones). Las favoritas salen primero. */
export function StationPicker({ label, value, onChange, stations, linesByStation, favorites }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const current = stations.find((s) => s.id === value);
  const sorted = useMemo(() => [...stations].sort((a, b) => a.name.localeCompare(b.name, 'es')), [stations]);
  const nq = norm(q);
  const matches = nq ? sorted.filter((s) => norm(s.name).includes(nq)) : sorted;
  const favs = nq ? [] : favorites.map((id) => stations.find((s) => s.id === id)).filter(Boolean) as Station[];
  const pick = (id: string) => { onChange(id); setOpen(false); setQ(''); };

  const item = (s: Station) => (
    <li key={s.id}>
      <button aria-current={s.id === value ? "true" : undefined} onClick={() => pick(s.id)}>
        <span>{s.name}</span>
        <span className="lns" aria-hidden="true">{(linesByStation.get(s.id) ?? []).map((l) => <LineChip key={l} id={l} />)}</span>
      </button>
    </li>
  );

  return (
    <>
      <span className="f" id={`lbl-${label}`}>{label}</span>
      <button className="picker" aria-labelledby={`lbl-${label}`} aria-describedby={`val-${label}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span id={`val-${label}`} className={current ? '' : 'ph'}>{current?.name ?? t('picker.choose')}</span>
      </button>
      {open && (
        <Sheet title={label} onClose={() => { setOpen(false); setQ(''); }}>
          <input type="search" data-autofocus aria-label={t('picker.search')} placeholder={t('picker.search')} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
          {favs.length > 0 && <><h4 className="f">{t('picker.favorites')}</h4><ul className="plist">{favs.map(item)}</ul></>}
          {!nq && <h4 className="f">{t('picker.all')}</h4>}
          {matches.length ? <ul className="plist">{matches.map(item)}</ul>
            : <p className="empty" role="status">{t('picker.none', { q })}</p>}
        </Sheet>
      )}
    </>
  );
}
