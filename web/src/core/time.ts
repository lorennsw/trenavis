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

/**
 * Hora escrita a mano -> minutos, o null si no se entiende.
 * Acepta "8:30", "08:30", "8.30", "8,30", "830", "0830", "8", "17h", "17 h 5".
 */
export function parseTypedTime(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (!s) return null;
  let h: number, m: number;
  let x: RegExpExecArray | null;
  if ((x = /^(\d{1,2})[:.,h](\d{1,2})?(?:min)?$/.exec(s))) { h = +x[1]; m = x[2] ? +x[2] : 0; if (x[2]?.length === 1 && /[:.,]/.test(s)) m *= 10; }
  else if ((x = /^(\d{1,2})h?$/.exec(s))) { h = +x[1]; m = 0; }
  else if ((x = /^(\d{3,4})$/.exec(s))) { h = +x[1].slice(0, -2); m = +x[1].slice(-2); }
  else return null;
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** Fecha (YYYYMMDD) + minutos en hora de Madrid -> segundos UNIX. Tiene en cuenta el cambio de hora. */
export function madridToEpoch(ymd: string, min: number): number {
  const target = Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8)) / 60000 + min; // "minutos UTC" que queremos ver en Madrid
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const m = madridNow(new Date(guess * 60000));
    const seen = Date.UTC(+m.date.slice(0, 4), +m.date.slice(4, 6) - 1, +m.date.slice(6, 8)) / 60000 + m.min;
    if (seen === target) break;
    guess += target - seen;
  }
  return guess * 60;
}
