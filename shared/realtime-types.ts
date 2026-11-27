/** Tipos del tiempo real que sirve el Worker (/api/realtime/*). Los usan el Worker y la web. */

export interface TripUpdate {
  tripId: string;
  delay: number | null;          // segundos (positivo = retraso)
  canceled: boolean;
  stops: { stopId: string; arrival?: number; departure?: number; arrivalDelay?: number; departureDelay?: number; skipped?: boolean }[];
}
export interface Vehicle { tripId: string; lat: number; lon: number; status?: string; stopId?: string; label?: string; timestamp?: number }
export interface Alert { id: string; routeIds: string[]; stopIds: string[]; start?: number; end?: number; text: { es?: string; ca?: string } }
export interface RealtimeResponse<T> { updatedAt: number; stale: boolean; data: T[]; error?: string }
