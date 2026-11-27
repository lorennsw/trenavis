import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import './styles.css';
import { App } from './App';

// Datos traídos desde la dirección antigua (#importar=…): se copian si aquí no hay nada y se limpia la dirección
(() => {
  const m = /^#importar=([^&]+)(?:&ir=(.*))?$/.exec(location.hash);
  if (!m) return;
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(m[1])))) as Record<string, string>;
    for (const [k, v] of Object.entries(data)) if (localStorage.getItem(`trenavis:${k}`) === null) localStorage.setItem(`trenavis:${k}`, v);
  } catch { /* datos no válidos: se ignoran */ }
  history.replaceState(null, '', m[2] ? `#${m[2]}` : location.pathname);
})();

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
