/** Utilidades de tiempo. Todo se calcula en hora de Madrid, sea cual sea la zona del dispositivo. */

export const TZ = 'Europe/Madrid';

/** Fecha (YYYYMMDD) y minutos desde medianoche en Madrid. */
export function madridNow(d: Date = new Date()): { date: string; min: number } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(d).map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}${p.month}${p.day}`, min: +p.hour * 60 + +p.minute };
}

/** Minutos (pueden ser negativos o >= 1440) -> "HH:MM" del reloj. */
export function fmt(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function parseHHMM(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function duration(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}

export function addDays(ymd: string, n: number): string {
  const d = new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8) + n));
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

export const ymdToIso = (ymd: string) => `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
export const isoToYmd = (iso: string) => iso.replace(/-/g, '');
