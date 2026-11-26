/**
 * Estaciones alcanzables desde un origen (o que llegan a un destino) con los recorridos reales:
 * sin transbordo o con uno como máximo, igual que la búsqueda.
 */
import type { Timetable } from './timetable';

export type Reach = Map<string, 'direct' | 'transfer'>;
export interface ReachIndex { next: Map<string, Set<string>>; prev: Map<string, Set<string>> }

const cache = new WeakMap<Timetable, ReachIndex>();

export function reachIndex(tt: Timetable): ReachIndex {
  const hit = cache.get(tt);
  if (hit) return hit;
  const next = new Map<string, Set<string>>(), prev = new Map<string, Set<string>>();
  const add = (m: Map<string, Set<string>>, k: string, v: string) => { let s = m.get(k); if (!s) m.set(k, (s = new Set())); s.add(v); };
  for (const f of tt.files) for (const p of f.patterns)
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) { add(next, p[i], p[j]); add(prev, p[j], p[i]); }
  const idx = { next, prev };
  cache.set(tt, idx);
  return idx;
}

function expand(m: Map<string, Set<string>>, start: string): Reach {
  const out: Reach = new Map();
  const first = m.get(start) ?? new Set<string>();
  for (const s of first) if (s !== start) out.set(s, 'direct');
  for (const x of first) for (const s of m.get(x) ?? []) if (s !== start && !out.has(s)) out.set(s, 'transfer');
  return out;
}

export const reachableFrom = (tt: Timetable, origin: string) => expand(reachIndex(tt).next, origin);
export const reachableTo = (tt: Timetable, dest: string) => expand(reachIndex(tt).prev, dest);
