import { describe, it, expect } from 'vitest';
import { parseCsvLine, toSeconds, ymdRange, weekdayOf } from '../tools/gtfs.ts';

describe('gtfs helpers', () => {
  it('recorta espacios y respeta comillas', () => {
    expect(parseCsvLine('51T0001R1  ,R1  ,"Sants, Clot"  ,2')).toEqual(['51T0001R1', 'R1', 'Sants, Clot', '2']);
  });
  it('convierte horas pasada la medianoche', () => {
    expect(toSeconds('06:35:00')).toBe(23700);
    expect(toSeconds('25:10:30')).toBe(90630);
  });
  it('expande rangos de fechas y cambio de mes', () => {
    expect(ymdRange('20261130', '20261202')).toEqual(['20261130', '20261201', '20261202']);
    expect(ymdRange('20261231', '20270101')).toEqual(['20261231', '20270101']);
  });
  it('calcula el día de la semana (0 = lunes)', () => {
    expect(weekdayOf('20261124')).toBe(1); // martes
    expect(weekdayOf('20261129')).toBe(6); // domingo
  });
});
