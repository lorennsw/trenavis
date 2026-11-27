/**
 * Tras compilar: escribe dist/precache.json con todos los ficheros de la app y pone una versión en dist/sw.js,
 * para que cada publicación instale un service worker nuevo que guarde la app completa (uso sin conexión).
 * Uso: tsx tools/build-sw.ts [dist]
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const dist = process.argv[2] ?? 'dist';
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(dist).map((p) => relative(dist, p).split('\\').join('/'))
  .filter((f) => !/^(sw\.js|precache\.json)$/.test(f) && !f.startsWith('legal/') && !f.endsWith('.woff')) // .woff2 basta
  .sort();
const list = ['./', ...files.filter((f) => f !== 'index.html')];
const version = createHash('sha256').update(list.map((f) => f + (f === './' ? '' : statSync(join(dist, f)).size)).join('|')).digest('hex').slice(0, 10);
writeFileSync(join(dist, 'precache.json'), JSON.stringify({ version, files: list }));
const sw = join(dist, 'sw.js');
writeFileSync(sw, readFileSync(sw, 'utf8').replace('__BUILD_VERSION__', version));
console.log(`Service worker ${version}: ${list.length} ficheros para uso sin conexión`);
