import { lineColor } from '../core/lines';

export function LineChip({ id }: { id: string }) {
  return <span className="ln" style={{ background: lineColor(id) }}>{id}</span>;
}
