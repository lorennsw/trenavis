import { useEffect } from 'react';
import { usePersisted } from '../store';
import { t } from '../i18n';

type Theme = 'auto' | 'light' | 'dark';

/** Selector de tema: automático (según el móvil), claro u oscuro. Se guarda solo en este dispositivo. */
export function ThemeSetting() {
  const [theme, setTheme] = usePersisted<Theme>('theme', 'auto');
  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'auto') delete el.dataset.theme; else el.dataset.theme = theme;
  }, [theme]);
  return (
    <>
      <h3>{t('theme.title')}</h3>
      <div className="seg" role="group" aria-label={t('theme.title')}>
        {(['auto', 'light', 'dark'] as const).map((k) => (
          <button key={k} aria-pressed={theme === k} onClick={() => setTheme(k)}>{t(`theme.${k}`)}</button>
        ))}
      </div>
      <p className="hint">{t('theme.hint')}</p>
    </>
  );
}
