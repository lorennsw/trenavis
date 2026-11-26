/** Formato compacto de datos generado por tools/build-gtfs.ts y servido por el Worker. */

export interface Station { id: string; name: string; lat: number; lon: number; wc: boolean }

export interface Line {
  id: string;            // R1, R2N, RG1...
  color: string;         // hex sin '#', el de Renfe en el GTFS (se reemplazará por colores propios en la UI)
  routeIds: string[];    // route_id del GTFS (para cruzar con alertas)
  stations: string[][];  // una lista ordenada de estaciones por patrón de parada más largo y dirección
}

/** Patrón de paradas compartido por muchos viajes. */
export type Pattern = string[]; // ids de estación en orden

export interface Trip {
  id: string;     // trip_id del GTFS (coincide con el de GTFS-Realtime)
  l: string;      // línea
  r: string;      // route_id
  s: number;      // índice de servicio en `services`
  p: number;      // índice de patrón en `patterns`
  a: number[];    // llegada a cada parada, minutos desde las 00:00 del día de servicio (puede pasar de 1440)
  d: number[];    // salida de cada parada
}

export interface Meta {
  generatedAt: string;
  source: string;
  license: string;
  attribution: string;
  validFrom: string;   // YYYYMMDD
  validTo: string;
  counts: Record<string, number>;
}

export interface TripsFile {
  line: string;
  /** services[i] = fechas YYYYMMDD en que circula ese servicio */
  services: string[][];
  patterns: Pattern[];
  trips: Trip[];
}
