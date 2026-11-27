import { useState } from 'react';
import { t } from '../i18n';
import { Sheet } from './Sheet';
import { unsubscribeAll } from '../push';

const PREFIX = 'trenavis:';

/** Todo lo que la app guarda en este dispositivo. */
export function collectData() {
  const data: Record<string, unknown> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (!k.startsWith(PREFIX)) continue;
      const raw = localStorage.getItem(k);
      try { data[k.slice(PREFIX.length)] = JSON.parse(raw ?? 'null'); } catch { data[k.slice(PREFIX.length)] = raw; }
    }
  } catch { /* sin almacenamiento */ }
  return { app: 'TrenAvís', exportedAt: new Date().toISOString(), note: 'Datos guardados en este dispositivo. Si tienes notificaciones activadas, el servidor guarda una copia mínima de tus avisos y del tren seguido.', data };
}

/** Borra todo: datos del servidor, del dispositivo, cachés y service worker. */
export async function deleteEverything() {
  await unsubscribeAll().catch(() => {});
  try { for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k); } catch { /* */ }
  try { for (const k of await caches.keys()) if (k.startsWith('trenavis-')) await caches.delete(k); } catch { /* */ }
  try { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch { /* */ }
}

export function YourData() {
  const [view, setView] = useState<'export' | 'delete' | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const json = JSON.stringify(collectData(), null, 2);

  const download = () => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'trenavis-mis-datos.json' });
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <h3>{t('data.title')}</h3>
      <div className="menu">
        <button className="mi" onClick={() => setView('export')}>{t('data.export')}</button>
        <button className="mi danger-text" onClick={() => setView('delete')}>{t('data.delete')}</button>
      </div>
      {view === 'export' && (
        <Sheet title={t('data.export')} onClose={() => { setView(null); setCopied(false); }}>
          <p>{t('data.exportInfo')}</p>
          <pre className="json" tabIndex={0} aria-label={t('data.export')}>{json}</pre>
          <div className="filters actions">
            <button className="btn pri" onClick={async () => { try { await navigator.clipboard.writeText(json); setCopied(true); } catch { setCopied(false); } }}>{copied ? `✓ ${t('data.copied')}` : t('data.copy')}</button>
            <button className="btn" onClick={download}>{t('data.download')}</button>
          </div>
        </Sheet>
      )}
      {view === 'delete' && (
        <Sheet title={t('data.deleteTitle')} onClose={() => setView(null)}>
          <p>{t('data.deleteInfo')}</p>
          <div className="filters actions">
            <button className="btn danger-solid" disabled={deleting} onClick={async () => { setDeleting(true); await deleteEverything(); location.hash = ''; location.reload(); }}>{deleting ? t('data.deleting') : t('data.deleteYes')}</button>
            <button className="btn" data-autofocus onClick={() => setView(null)}>{t('alarms.deleteNo')}</button>
          </div>
        </Sheet>
      )}
    </>
  );
}
