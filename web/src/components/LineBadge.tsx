import { lineColor } from '../core/lines';

/** Insignia grande de línea, estilo panel de andén. R2S/R2N se muestran como "R2" con "Sud"/"Nord" debajo. */
export function LineBadge({ id }: { id: string }) {
  const m = /^(R2)([NS])$/.exec(id);
  return (
    <span className={`lb${m ? ' two' : ''}`} style={{ background: lineColor(id) }} aria-label={`Línea ${id}`} role="img">
      {m ? <><b>{m[1]}</b><small>{m[2] === 'S' ? 'Sud' : 'Nord'}</small></> : <b>{id}</b>}
    </span>
  );
}
