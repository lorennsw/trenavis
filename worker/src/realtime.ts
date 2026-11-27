/** Normaliza el GTFS-Realtime JSON de Renfe y lo reduce a Rodalies de Catalunya. */

import type { Alert, TripUpdate, Vehicle } from '../../shared/realtime-types.ts';
export type { Alert, TripUpdate, Vehicle };

export const RT_BASE = 'https://gtfsrt.renfe.com';
const isRodaliesTrip = (id: string) => id.startsWith('51');
const isRodaliesRoute = (id: string) => id.trim().startsWith('51T');
const num = (v: unknown) => (v === undefined || v === null ? undefined : Number(v));


export function normalizeTripUpdates(json: any): TripUpdate[] {
  return (json?.entity ?? [])
    .filter((e: any) => e.tripUpdate && isRodaliesTrip(e.tripUpdate.trip?.tripId ?? ''))
    .map((e: any): TripUpdate => {
      const t = e.tripUpdate;
      return {
        tripId: t.trip.tripId,
        delay: num(t.delay) ?? null,
        canceled: t.trip.scheduleRelationship === 'CANCELED',
        stops: (t.stopTimeUpdate ?? []).map((s: any) => ({
          stopId: s.stopId,
          arrival: num(s.arrival?.time), departure: num(s.departure?.time),
          arrivalDelay: num(s.arrival?.delay), departureDelay: num(s.departure?.delay),
          ...(s.scheduleRelationship === 'SKIPPED' ? { skipped: true } : {}),
        })),
      };
    });
}

export function normalizeVehicles(json: any): Vehicle[] {
  return (json?.entity ?? [])
    .filter((e: any) => e.vehicle?.position && isRodaliesTrip(e.vehicle.trip?.tripId ?? ''))
    .map((e: any): Vehicle => ({
      tripId: e.vehicle.trip.tripId,
      lat: e.vehicle.position.latitude, lon: e.vehicle.position.longitude,
      status: e.vehicle.currentStatus, stopId: e.vehicle.stopId,
      label: e.vehicle.vehicle?.label, timestamp: num(e.vehicle.timestamp),
    }));
}

/** El feed marca ambos idiomas como "es": se distinguen por orden (castellano, catalán). */
export function normalizeAlerts(json: any): Alert[] {
  return (json?.entity ?? [])
    .filter((e: any) => e.alert && (e.alert.informedEntity ?? []).some((i: any) => isRodaliesRoute(i.routeId ?? '')))
    .map((e: any): Alert => {
      const a = e.alert;
      const tr: { text: string }[] = a.descriptionText?.translation ?? a.headerText?.translation ?? [];
      return {
        id: e.id,
        routeIds: [...new Set<string>((a.informedEntity ?? []).map((i: any) => (i.routeId ?? '').trim()).filter(isRodaliesRoute))],
        stopIds: [...new Set<string>((a.informedEntity ?? []).map((i: any) => (i.stopId ?? '').trim()).filter(Boolean))],
        start: num(a.activePeriod?.[0]?.start), end: num(a.activePeriod?.[0]?.end),
        text: { es: tr[0]?.text, ca: tr[1]?.text },
      };
    });
}
