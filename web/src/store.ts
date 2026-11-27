/** Preferencias guardadas solo en este dispositivo (localStorage). Nunca rompe si el almacenamiento falla. */
import { useEffect, useRef, useState } from 'react';

const PREFIX = 'trenavis:';

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch { return fallback; }
}
export function save(key: string, value: unknown) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* sin almacenamiento: no pasa nada */ }
  try { dispatchEvent(new CustomEvent('trenavis-store', { detail: key })); } catch { /* entorno sin window */ }
}

export function usePersisted<T>(key: string, fallback: T): [T, (v: T | ((p: T) => T)) => void] {
  const [v, setV] = useState<T>(() => load(key, fallback));
  const first = useRef(true);
  // No se guarda al montar: solo cuando el usuario cambia algo (así no se crean datos vacíos por defecto)
  useEffect(() => { if (first.current) { first.current = false; return; } save(key, v); }, [key, v]);
  return [v, setV];
}
