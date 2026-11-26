/**
 * Colores propios de TrenAvís para cada línea (no son los oficiales). Todos con contraste >= 4.5:1 sobre texto blanco.
 */
export const LINE_COLORS: Record<string, string> = {
  R1: '#1F5FAD', R2: '#1D7A3A', R2N: '#3F6E12', R2S: '#14663A', R3: '#B83C14', R4: '#8F5A06',
  R7: '#7B2CBF', R8: '#B0175A', R11: '#2140A8', R13: '#8E1C4C', R14: '#5A2AB0', R15: '#7A3A12',
  R16: '#B21E1E', R17: '#93410F', RG1: '#0E6A85', RL3: '#4338CA', RL4: '#9A4A06', RT1: '#0F6E66', RT2: '#B0123A',
};
export const lineColor = (id: string) => LINE_COLORS[id] ?? '#3B4256';

/** Orden natural: R1, R2, R2N, R2S, R3 … R17, RG1, RL3, RL4, RT1, RT2 */
export const compareLines = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true });
