import { useState } from 'react';
import { load, save } from '../store';
import { t } from '../i18n';

/** Aviso informativo la primera vez (no pide consentimiento: solo hay almacenamiento técnico necesario). */
export function StorageNotice({ onRead }: { onRead: () => void }) {
  const [seen, setSeen] = useState(() => load('noticeSeen', false));
  if (seen) return null;
  const ok = () => { save('noticeSeen', true); setSeen(true); };
  return (
    <div className="notice" role="region" aria-label={t('notice.label')}>
      <p><b>{t('notice.title')}</b> {t('notice.body')}</p>
      <div className="filters">
        <button className="btn sm" onClick={onRead}>{t('notice.read')}</button>
        <button className="btn pri sm" onClick={ok}>{t('notice.ok')}</button>
      </div>
    </div>
  );
}
