/**
 * Genera las páginas legales estáticas (sin JavaScript) en <dist>/legal/<id>.html a partir de web/src/legal/content.ts.
 * Sirven como enlace público (p. ej. la política de privacidad que pide Google Play).
 * Uso: tsx tools/build-legal.ts [dist]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEGAL, type LegalDoc } from '../web/src/legal/content.ts';

const dist = process.argv[2] ?? 'dist';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rich = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[(.+?)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');

const css = `:root{color-scheme:light dark;--bg:#fff;--ink:#0b0d14;--mut:#4f5973;--line:#d5dbef;--co:#1240e0;--co2:#0d32b5}
@media (prefers-color-scheme:dark){:root{--bg:#0a0d18;--ink:#eef1fb;--mut:#a0aac6;--line:#262e4a;--co2:#7b96ff}}
body{margin:0;background:var(--bg);color:var(--ink);font:1rem/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{background:var(--co);color:#fff;padding:14px 16px}header a{color:#fff;font-weight:700;text-decoration:none}
main{max-width:720px;margin:0 auto;padding:8px 16px 48px}h1{line-height:1.2}h2{font-size:1.15rem;margin-top:28px}
a{color:var(--co2)}.mut{color:var(--mut)}nav ul{padding-left:20px}footer{border-top:1px solid var(--line);margin-top:32px;padding-top:12px;font-size:.9rem;color:var(--mut)}`;

const page = (title: string, body: string) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · TrenAvís</title><meta name="description" content="${esc(title)} de TrenAvís, app no oficial de Rodalies de Catalunya.">
<link rel="icon" href="../icon.svg" type="image/svg+xml"><style>${css}</style></head>
<body><header><a href="../">← TrenAvís</a></header><main>${body}
<footer><nav><ul>${LEGAL.map((d) => `<li><a href="${d.id}.html">${esc(d.title)}</a></li>`).join('')}</ul></nav>
<p>TrenAvís es una app no oficial, sin relación con Renfe, Adif ni la Generalitat de Catalunya.</p></footer></main></body></html>`;

const docHtml = (d: LegalDoc) => `<h1>${esc(d.title)}</h1>${d.intro ? `<p class="mut">${rich(d.intro)}</p>` : ''}${d.sections.map((s) =>
  `${s.h ? `<h2>${esc(s.h)}</h2>` : ''}${(s.p ?? []).map((p) => `<p>${rich(p)}</p>`).join('')}${s.ul ? `<ul>${s.ul.map((li) => `<li>${rich(li)}</li>`).join('')}</ul>` : ''}`).join('')}`;

mkdirSync(join(dist, 'legal'), { recursive: true });
for (const d of LEGAL) writeFileSync(join(dist, 'legal', `${d.id}.html`), page(d.title, docHtml(d)));
writeFileSync(join(dist, 'legal', 'index.html'), page('Legal y privacidad', `<h1>Legal y privacidad</h1><ul>${LEGAL.map((d) => `<li><a href="${d.id}.html">${esc(d.title)}</a></li>`).join('')}</ul>`));
console.log(`Páginas legales: ${LEGAL.length + 1} → ${join(dist, 'legal')}`);
