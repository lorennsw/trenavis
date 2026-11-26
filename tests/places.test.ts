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
