import { legalDoc, LEGAL } from '../legal/content';
import { rich } from '../legal/rich';
import { t } from '../i18n';
import { Sheet } from './Sheet';

/** Muestra una página legal. Cada una tiene además su página estática en /legal/<id>.html. */
export function LegalSheet({ id, onClose, onOpen }: { id: string; onClose: () => void; onOpen: (id: string) => void }) {
  const doc = legalDoc(id);
  if (!doc) return null;
  return (
    <Sheet title={doc.title} onClose={onClose}>
      <div className="legal">
        {doc.intro && <p className="rmut">{rich(doc.intro)}</p>}
        {doc.sections.map((s, i) => (
          <section key={i}>
            {s.h && <h4>{s.h}</h4>}
            {s.p?.map((x, j) => <p key={j}>{rich(x)}</p>)}
            {s.ul && <ul>{s.ul.map((x, j) => <li key={j}>{rich(x)}</li>)}</ul>}
          </section>
        ))}
        <p className="hint">{t('legal.static')} <a href={`${import.meta.env.BASE_URL}legal/${doc.id}.html`} target="_blank" rel="noopener">{t('legal.openPage')}</a></p>
        <div className="filters">{LEGAL.filter((d) => d.id !== id).map((d) => <button key={d.id} className="fl" onClick={() => onOpen(d.id)}>{d.title}</button>)}</div>
      </div>
    </Sheet>
  );
}
