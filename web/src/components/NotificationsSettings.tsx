import { useEffect, useState } from 'react';
import { usePersisted } from '../store';
import { isIOS, isStandalone, NO_PREFS, permission, pushSupported, serverReady, subscribe, testNotification, unsubscribeAll, type NotifPrefs } from '../push';
import { t } from '../i18n';
import { Sheet } from './Sheet';

/** Más → Avisos: activar/desactivar cada tipo de aviso, permiso del sistema y guía de instalación. */
export function NotificationsSettings() {
  const [prefs, setPrefs] = usePersisted<NotifPrefs>('notif', NO_PREFS);
  const [perm, setPerm] = useState(permission());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [guide, setGuide] = useState(false);
  const [syncOk, setSyncOk] = useState<boolean | null>(null);
  const [server, setServer] = useState<boolean | null>(null);
  useEffect(() => { serverReady().then(setServer); }, []);
  useEffect(() => { const on = (e: Event) => setSyncOk((e as CustomEvent).detail); addEventListener('trenavis-sync', on); return () => removeEventListener('trenavis-sync', on); }, []);

  const iosNeedsInstall = isIOS() && !isStandalone();
  const supported = pushSupported() && !iosNeedsInstall;

  const toggle = async (k: keyof NotifPrefs) => {
    setMsg('');
    const next = { ...prefs, [k]: !prefs[k] };
    if (next[k]) {
      setBusy(true);
      try { await subscribe(); setPerm(permission()); setPrefs(next); }
      catch (e) {
        const code = (e as Error).message;
        setPerm(permission());
        setMsg(code === 'denied' ? t('notif.denied') : code === 'dismissed' ? t('notif.dismissed') : t('notif.error'));
      } finally { setBusy(false); }
    } else {
      setPrefs(next);
      if (!next.follow && !next.alarms) { setBusy(true); await unsubscribeAll(); setBusy(false); setMsg(t('notif.allOff')); }
    }
  };

  return (
    <>
      <h3>{t('notif.title')}</h3>
      {!isStandalone() && <button className="btn wide install" onClick={() => setGuide(true)}>📲 {t('notif.howInstall')}</button>}
      {server === false ? (
        <div className="info"><p style={{ margin: 0 }}>{t('notif.serverOff')}</p></div>
      ) : !supported ? (
        <div className="info">
          <p style={{ margin: 0 }}>{iosNeedsInstall ? t('notif.iosInstall') : t('notif.unsupported')}</p>
        </div>
      ) : (
        <>
          <Row label={t('notif.follow')} desc={t('notif.followDesc')} on={prefs.follow} disabled={busy} onToggle={() => toggle('follow')} />
          <Row label={t('notif.alarms')} desc={t('notif.alarmsDesc')} on={prefs.alarms} disabled={busy} onToggle={() => toggle('alarms')} />
          <div className="set">
            <div>{t('notif.system')}<small>{perm === 'granted' ? t('notif.perm.granted') : perm === 'denied' ? t('notif.perm.denied') : t('notif.perm.default')}</small></div>
            {perm === 'granted' && <button className="btn sm" onClick={() => testNotification(t('notif.testTitle'), t('notif.testBody'))}>{t('notif.test')}</button>}
          </div>
          {(prefs.follow || prefs.alarms) && syncOk === false && <p className="hint bad" role="alert">{t('notif.syncFail')}</p>}
          <p className="hint">{t('notif.privacy')}</p>
        </>
      )}
      {msg && <p className="hint" role="status">{msg}</p>}
      {guide && (
        <Sheet title={t('notif.howInstall')} onClose={() => setGuide(false)}>
          <h4>iPhone / iPad (iOS 16.4 o superior)</h4>
          <ol className="guide">
            <li>Abre <b>lorennsw.github.io/trenavis</b> en <b>Safari</b>.</li>
            <li>Toca el botón <b>Compartir</b> (el cuadrado con la flecha hacia arriba).</li>
            <li>Elige <b>«Añadir a pantalla de inicio»</b> y toca <b>Añadir</b>.</li>
            <li>Abre TrenAvís <b>desde el icono</b> de la pantalla de inicio.</li>
            <li>Ve a <b>Más → Avisos</b> y activa los que quieras. Acepta el permiso de notificaciones.</li>
          </ol>
          <p className="hint">{t('notif.iosNote')}</p>
          <h4>Android</h4>
          <ol className="guide">
            <li>Abre la web en <b>Chrome</b>.</li>
            <li>Toca el menú <b>⋮</b> y elige <b>«Instalar aplicación»</b> o <b>«Añadir a pantalla de inicio»</b>.</li>
            <li>Activa los avisos en <b>Más → Avisos</b> (en Android también funcionan sin instalarla).</li>
          </ol>
        </Sheet>
      )}
    </>
  );
}

function Row({ label, desc, on, disabled, onToggle }: { label: string; desc: string; on: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <div className="set">
      <div>{label}<small>{desc}</small></div>
      <button className="sw" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onToggle} />
    </div>
  );
}
