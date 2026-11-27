import { createContext, useContext } from 'react';
import type { Meta, Place, Station } from '../../shared/types';
import type { Timetable, Run } from './core/timetable';
import type { PlatformNotes } from './core/platform';
import type { RTState } from './core/live';

/** Tren que el usuario sigue ('Voy en este'). Se guarda en el dispositivo y se borra solo a las 24 h. */
export interface Follow { tripId: string; serviceDate: string; from: string; to: string; savedAt: number }

export interface AppData {
  tt: Timetable;
  meta: Meta;
  stations: Station[];
  places: Place[];
  linesByStation: Map<string, string[]>;
  lineIds: string[];
  favorites: string[];
  toggleFavorite: (id: string) => void;
  platforms: PlatformNotes;
  setPlatform: (key: string, value: string | null) => void;
  now: { date: string; min: number };
  openTrain: (run: Run, date: string, from?: string, to?: string) => void;
  rt: RTState;
  follow: Follow | null;
  setFollow: (f: Follow | null) => void;
  openLine: (lineId: string, dir?: number) => void;
  openMap: (lineId?: string) => void;
  openLegal: (id: string) => void;
}
export const Ctx = createContext<AppData | null>(null);
export const useApp = () => useContext(Ctx)!;
