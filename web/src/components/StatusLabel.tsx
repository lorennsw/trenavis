import type { Status } from '../core/live';
import { t } from '../i18n';

/** Estado del tren siempre con texto (no solo color). */
export function StatusLabel({ s, long }: { s: Status; long?: boolean }) {
  switch (s.kind) {
    case 'canceled': return <span className="st st-can">{t('status.canceled')}</span>;
    case 'late': return <span className="st st-late">{long ? t('status.lateLong', { m: s.min }) : t('status.late', { m: s.min })}</span>;
    case 'ontime': return <span className="st st-ok">{t('status.ontime')}</span>;
    case 'nodata': return <span className="st st-mut">{t('status.nodata')}</span>;
    default: return <span className="st st-mut">{t('status.scheduled')}</span>;
  }
}
