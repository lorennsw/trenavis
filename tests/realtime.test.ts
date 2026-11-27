import { describe, it, expect } from 'vitest';
import { normalizeAlerts, normalizeTripUpdates, normalizeVehicles } from '../worker/src/realtime.ts';

describe('normalización GTFS-RT', () => {
  it('filtra trip updates de Rodalies y detecta cancelados', () => {
    const r = normalizeTripUpdates({ entity: [
      { tripUpdate: { trip: { tripId: '5129J15013R15' }, delay: 4200, stopTimeUpdate: [{ stopId: '71503', arrival: { delay: 4200, time: '1795711086' } }] } },
      { tripUpdate: { trip: { tripId: '3029J18779C3' }, delay: 0 } },
      { tripUpdate: { trip: { tripId: '5129J1X', scheduleRelationship: 'CANCELED' } } },
      { tripUpdate: { trip: { tripId: '5129J2X' }, stopTimeUpdate: [{ stopId: '79100', scheduleRelationship: 'SKIPPED' }] } },
    ] });
    expect(r.map((x) => x.tripId)).toEqual(['5129J15013R15', '5129J1X', '5129J2X']);
    expect(r[2].stops[0].skipped).toBe(true);
    expect(r[0].stops[0].skipped).toBeUndefined();
    expect(r[0].delay).toBe(4200);
    expect(r[0].stops[0].arrival).toBe(1795711086);
    expect(r[1].canceled).toBe(true);
  });
  it('ignora vehículos sin posición o de otros núcleos', () => {
    const r = normalizeVehicles({ entity: [
      { vehicle: { trip: { tripId: '5129J28538R2' }, position: { latitude: 41.3, longitude: 2.0 }, stopId: '71706', vehicle: { label: 'R2-28538' } } },
      { vehicle: { trip: { tripId: '3029J1' }, position: { latitude: 37, longitude: -5 } } },
      { vehicle: { trip: { tripId: '5129J2' } } },
    ] });
    expect(r).toHaveLength(1);
    expect(r[0].label).toBe('R2-28538');
  });
  it('separa los textos es/ca de las alertas y filtra por ruta 51T', () => {
    const r = normalizeAlerts({ entity: [
      { id: 'A1', alert: { informedEntity: [{ routeId: '51T0020R4' }, { routeId: '51T0031R4' }], descriptionText: { translation: [{ text: 'Retrasos' }, { text: 'Retards' }] } } },
      { id: 'A2', alert: { informedEntity: [{ routeId: '10T0005C2' }] } },
    ] });
    expect(r).toHaveLength(1);
    expect(r[0].text).toEqual({ es: 'Retrasos', ca: 'Retards' });
    expect(r[0].routeIds).toEqual(['51T0020R4', '51T0031R4']);
  });
});
