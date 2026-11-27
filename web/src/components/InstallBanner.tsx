import { useState } from 'react';
import { useInstall } from '../install';
import { load, save } from '../store';
import { t } from '../i18n';

/** Aviso discreto arriba para instalar la app con un toque (solo si el navegador lo permite y no se ha cerrado). */
export function InstallBanner() {
  const { state, install } = useInstall();
  const [hidden, setHidden] = useState(() => load('installBannerClosed', false));
  if (state !== 'available' || hidden) return null;
  const close = () => { save('installBannerClosed', true); setHidden(true); };
  return (
    <div className="installbar" role="region" aria-label={t('install.title')}>
      <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width={40} height={40} />
      <div><b>{t('install.title')}</b><small>{t('install.why')}</small></div>
      <button className="btn pri sm" onClick={async () => { if (await install()) close(); }}>{t('install.go')}</button>
      <button className="btn sm icon" aria-label={t('install.close')} onClick={close}>✕</button>
    </div>
  );
}
