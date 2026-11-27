import { describe, it, expect } from 'vitest';
import { assignAreas, selectPlaces } from '../tools/build-places';
import { titleCaseTown } from '../tools/gtfs';

describe('OSM', () => {
  it('asigna municipio y provincia a cada estación por los marcadores', () => {
    const m = assignAreas([
      { type: 'm', tags: { sid: '1' } },
      { type: 'area', tags: { admin_level: '8', name: 'Cunit' } },
      { type: 'area', tags: { admin_level: '6', name: 'Tarragona' } },
      { type: 'm', tags: { sid: '2' } },
      { type: 'area', tags: { admin_level: '6', name: 'Lleida', 'name:es': 'Lérida' } },
    ]);
    expect(m.get('1')).toEqual({ town: 'Cunit', prov: 'Tarragona' });
    expect(m.get('2')).toEqual({ prov: 'Lleida' });
  });
  it('elige lugares cercanos sin duplicados ni nombres de estación', () => {
    const st = [{ id: 'a', name: 'Sant Vicenç de Calders', lat: 41.186, lon: 1.53, wc: true }];
    const p = selectPlaces([
      { lat: 41.1816, lon: 1.523, tags: { name: 'Coma-ruga' } },
      { lat: 41.1817, lon: 1.5231, tags: { name: 'Coma-ruga' } },
      { lat: 42.5, lon: 2.5, tags: { name: 'Lejos' } },
      { lat: 41.186, lon: 1.53, tags: { name: 'Sant Vicenç de Calders' } },
    ], st);
    expect(p.map((x) => x.n)).toEqual(['Coma-ruga']);
  });
  it('normaliza municipios de Renfe', () => {
    expect(titleCaseTown('VENDRELL (EL)')).toBe('El Vendrell');
    expect(titleCaseTown("HOSPITALET DE LLOBREGAT (L')")).toBe("L'Hospitalet de Llobregat");
    expect(titleCaseTown('SANT VICENÇ DE CALDERS')).toBe('Sant Vicenç de Calders');
  });
});

import { applyAreas } from '../tools/apply-areas';
describe('aplicar municipios de OSM', () => {
  it('sobrescribe municipio y provincia cuando OSM los tiene', () => {
    const st = [{ id: '1', name: 'Cunit', lat: 0, lon: 0, wc: true, prov: 'Barcelona' }, { id: '2', name: 'X', lat: 0, lon: 0, wc: true, town: 'X', prov: 'Lleida' }];
    expect(applyAreas(st, { '1': { town: 'Cunit', prov: 'Tarragona' } })).toBe(1);
    expect(st[0]).toMatchObject({ town: 'Cunit', prov: 'Tarragona' });
    expect(st[1]).toMatchObject({ town: 'X', prov: 'Lleida' });
  });
});

import { importData } from '../web/src/components/YourData';
describe('importar datos', () => {
  it('importa una exportación válida y omite notificaciones', () => {
    const store = new Map<string, string>();
    (globalThis as any).localStorage = { setItem: (k: string, v: string) => store.set(k, v), getItem: (k: string) => store.get(k) ?? null };
    const n = importData(JSON.stringify({ app: 'TrenAvís', data: { favorites: ['71500'], alarms: [{ id: 'a1' }], notif: { follow: true }, 'mal clave!': 1 } }));
    expect(n).toBe(2);
    expect(store.get('trenavis:favorites')).toBe('["71500"]');
    expect(store.has('trenavis:notif')).toBe(false);
    expect(importData('{"app":"Otra"}')).toBe(-1);
    expect(importData('no es json')).toBe(-1);
  });
});
