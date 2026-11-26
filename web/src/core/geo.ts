export interface LatLon { lat: number; lon: number }

export function distKm(a: LatLon, b: LatLon): number {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Las `k` estaciones más cercanas a un punto, a menos de `maxKm`. */
export function nearestStations<T extends LatLon>(p: LatLon, list: T[], k = 3, maxKm = 12): { item: T; km: number }[] {
  return list.map((item) => ({ item, km: distKm(p, item) })).filter((x) => x.km <= maxKm).sort((a, b) => a.km - b.km).slice(0, k);
}

export const fmtKm = (km: number) => (km < 1 ? `${Math.round(km * 1000 / 50) * 50} m` : `${km.toFixed(km < 10 ? 1 : 0).replace('.', ',')} km`);

/** Ignora tildes, mayúsculas, guiones y apóstrofos: "coma ruga" encuentra "Coma-ruga". */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
