// Public holidays (nationwide ones only) computed per year, Easter via the Gregorian computus.
import { dnOf } from './dates';
import type { Region } from './types';

export type HolidayKey =
  | 'newYear' | 'epiphany' | 'goodFriday' | 'easterMonday' | 'labour' | 'ascension' | 'whitMonday'
  | 'corpusChristi' | 'swissNational' | 'assumption' | 'germanUnity' | 'austrianNational' | 'allSaints'
  | 'immaculate' | 'christmas' | 'stStephen';

export const REGIONS: Region[] = ['AT', 'DE', 'CH', 'none'];

export function easterSunday(y: number): number {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return dnOf(y, month - 1, day);
}

const cache = new Map<string, Map<number, HolidayKey>>();

function holidaysOf(region: Region, y: number): Map<number, HolidayKey> {
  const k = `${region}-${y}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const out = new Map<number, HolidayKey>();
  if (region !== 'none') {
    const E = easterSunday(y);
    const add = (n: number, key: HolidayKey) => out.set(n, key);
    add(dnOf(y, 0, 1), 'newYear');
    add(E + 1, 'easterMonday');
    add(E + 39, 'ascension');
    add(E + 50, 'whitMonday');
    add(dnOf(y, 11, 25), 'christmas');
    add(dnOf(y, 11, 26), 'stStephen');
    if (region === 'AT') {
      add(dnOf(y, 0, 6), 'epiphany');
      add(dnOf(y, 4, 1), 'labour');
      add(E + 60, 'corpusChristi');
      add(dnOf(y, 7, 15), 'assumption');
      add(dnOf(y, 9, 26), 'austrianNational');
      add(dnOf(y, 10, 1), 'allSaints');
      add(dnOf(y, 11, 8), 'immaculate');
    } else if (region === 'DE') {
      add(E - 2, 'goodFriday');
      add(dnOf(y, 4, 1), 'labour');
      add(dnOf(y, 9, 3), 'germanUnity');
    } else if (region === 'CH') {
      add(E - 2, 'goodFriday');
      add(dnOf(y, 7, 1), 'swissNational');
    }
  }
  cache.set(k, out);
  return out;
}

export function holidayOn(region: Region, n: number): HolidayKey | null {
  const y = new Date(n * 864e5).getUTCFullYear();
  return holidaysOf(region, y).get(n) || null;
}

/** Guess the region from a BCP-47 locale such as "de-AT". */
export function regionFromLocale(locale: string): Region {
  const m = /-([A-Z]{2})\b/.exec(locale || '');
  const c = m ? m[1] : '';
  return c === 'AT' || c === 'DE' || c === 'CH' ? c : 'none';
}
