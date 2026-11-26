import { createContext, useContext } from 'react';
import type { Meta, Station } from '../../shared/types';
import type { Timetable, Run } from './core/timetable';

export interface AppData {
  tt: Timetable;
  meta: Meta;
  stations: Station[];
  linesByStation: Map<string, string[]>;
  lineIds: string[];
  favorites: string[];
  toggleFavorite: (id: string) => void;
  now: { date: string; min: number };
  openTrain: (run: Run, date: string, from?: string, to?: string) => void;
}
export const Ctx = createContext<AppData | null>(null);
export const useApp = () => useContext(Ctx)!;
