import { t } from '../i18n';

/** Filtros de línea (botones conmutables). Ninguno seleccionado = todas. */
export function LineFilter({ all, selected, onChange, plain }: { all: string[]; selected: Set<string>; onChange: (s: Set<string>) => void; plain?: boolean }) {
  const toggle = (id: string) => { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); onChange(n); };
  if (all.length < 2) return null;
  const chips = (
    <div className="filters" role="group" aria-label={t('search.lines')}>
      <button className="fl" aria-pressed={selected.size === 0} onClick={() => onChange(new Set())}>{t('search.allLines')}</button>
      {all.map((id) => <button key={id} className="fl" aria-pressed={selected.has(id)} onClick={() => toggle(id)}>{id}</button>)}
    </div>
  );
  if (plain || all.length <= 10) return chips;
  // Con muchas líneas, plegadas para no ocupar media pantalla
  return (
    <details className="lf">
      <summary>{t('search.lines')}: <b>{selected.size ? [...selected].join(', ') : t('search.allLines')}</b></summary>
      {chips}
    </details>
  );
}
