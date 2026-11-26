import { useEffect, useRef, type ReactNode } from 'react';
import { t } from '../i18n';

/** Hoja inferior modal accesible: foco dentro, Escape cierra y el foco vuelve a donde estaba. */
export function Sheet({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useRef(`sheet-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current!;
    const first = el.querySelector<HTMLElement>('[data-autofocus]') ?? el.querySelector<HTMLElement>('button, input, [tabindex]');
    first?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key !== 'Tab') return;
      const f = [...el.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, a[href], [tabindex]:not([tabindex="-1"])')];
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; prev?.focus?.({ preventScroll: true }); };
  }, [onClose]);

  return (
    <div className="ov" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <div className="sheet-head">
          <h3 id={titleId}>{title}</h3>
          <button className="btn sm" onClick={onClose}>{t('common.close')}</button>
        </div>
        {children}
      </div>
    </div>
  );
}
