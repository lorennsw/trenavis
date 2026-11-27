import { createContext, useContext } from 'react';
import type { Meta, Place, Station } from '../../shared/types';
import type { Timetable, Run } from './core/timetable';
import type { PlatformNotes } from './core/platform';

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
}
export const Ctx = createContext<AppData | null>(null);
export const useApp = () => useContext(Ctx)!;
