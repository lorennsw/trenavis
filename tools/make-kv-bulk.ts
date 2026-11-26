/** Genera data/out/kv-bulk.json para:  npx wrangler kv bulk put data/out/kv-bulk.json --binding DATA --config worker/wrangler.toml --remote */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const out = process.argv[2] ?? 'data/out';
const entries = ['meta', 'stations', 'lines'].map((k) => ({ key: k, value: readFileSync(join(out, `${k}.json`), 'utf8') }));
for (const f of readdirSync(join(out, 'trips'))) entries.push({ key: `trips:${f.replace('.json', '')}`, value: readFileSync(join(out, 'trips', f), 'utf8') });
writeFileSync(join(out, 'kv-bulk.json'), JSON.stringify(entries));
console.log(`${entries.length} claves → ${join(out, 'kv-bulk.json')}`);
