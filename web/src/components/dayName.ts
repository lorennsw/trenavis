import { addDays } from '../core/time';
import { DAY_LONG, weekday } from '../core/alarms';
import { t } from '../i18n';

/** "hoy", "mañana" o "el lunes 30/11". */
export function dayName(date: string, today: string): string {
  if (date === today) return t('alarms.today');
  if (date === addDays(today, 1)) return t('alarms.tomorrow');
  return `el ${DAY_LONG[weekday(date)]} ${date.slice(6, 8)}/${date.slice(4, 6)}`;
}
