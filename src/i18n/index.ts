import { dateOf, dnOf } from '../core/dates';
import type { HolidayKey } from '../core/holidays';
import type { Lang, Region } from '../core/types';
import { de } from './de';
import { en, type Dict } from './en';

const DICTS: Record<Lang, Dict> = { en: en as unknown as Dict, de };
export type Key = keyof Dict;
type Args<K extends Key> = Dict[K] extends (...a: infer A) => string ? A : [];
export type T = <K extends Key>(k: K, ...a: Args<K>) => string;

export function resolveLang(pref: 'auto' | Lang): Lang {
  if (pref === 'en' || pref === 'de') return pref;
  const nav = (typeof navigator !== 'undefined' && (navigator.languages?.[0] || navigator.language)) || 'en';
  return nav.toLowerCase().startsWith('de') ? 'de' : 'en';
}

export interface Formatters {
  short(n: number): string;
  day(n: number): string;
  long(n: number): string;
  range(a: number, b: number): string;
  month(m0: number): string;
  wd2(dow: number): string;
  wdLong(dow: number): string;
  dur(min: number): string;
  hrs(min: number): string;
  number(x: number): string;
}

export interface I18n {
  lang: Lang;
  t: T;
  f: Formatters;
  holiday(k: HolidayKey, region: Region): string;
}

const HOL: Record<Lang, Record<HolidayKey, string>> = {
  en: {
    newYear: 'New Year’s Day', epiphany: 'Epiphany', goodFriday: 'Good Friday', easterMonday: 'Easter Monday', labour: 'Labour Day',
    ascension: 'Ascension Day', whitMonday: 'Whit Monday', corpusChristi: 'Corpus Christi', swissNational: 'Swiss National Day',
    assumption: 'Assumption Day', germanUnity: 'Day of German Unity', austrianNational: 'Austrian National Day', allSaints: 'All Saints’ Day',
    immaculate: 'Immaculate Conception', christmas: 'Christmas Day', stStephen: 'St Stephen’s Day',
  },
  de: {
    newYear: 'Neujahr', epiphany: 'Heilige Drei Könige', goodFriday: 'Karfreitag', easterMonday: 'Ostermontag', labour: 'Tag der Arbeit',
    ascension: 'Christi Himmelfahrt', whitMonday: 'Pfingstmontag', corpusChristi: 'Fronleichnam', swissNational: 'Bundesfeiertag',
    assumption: 'Mariä Himmelfahrt', germanUnity: 'Tag der Deutschen Einheit', austrianNational: 'Nationalfeiertag', allSaints: 'Allerheiligen',
    immaculate: 'Mariä Empfängnis', christmas: 'Weihnachten', stStephen: 'Stephanstag',
  },
};
const HOL_REGIONAL: Partial<Record<Region, Partial<Record<HolidayKey, string>>>> = {
  AT: { labour: 'Staatsfeiertag', christmas: 'Christtag', stStephen: 'Stefanitag' },
  DE: { christmas: '1. Weihnachtsfeiertag', stStephen: '2. Weihnachtsfeiertag' },
};

export function makeI18n(lang: Lang, region: Region = 'none'): I18n {
  const dict = DICTS[lang];
  const loc = lang === 'de' ? (region === 'AT' ? 'de-AT' : region === 'CH' ? 'de-CH' : 'de-DE') : 'en-GB';
  const df = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(loc, { timeZone: 'UTC', ...o });
  const fShort = df({ day: 'numeric', month: 'short' });
  const fDay = df({ weekday: 'short', day: 'numeric', month: 'short' });
  const fLong = df({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fRange = df({ day: 'numeric', month: 'short', year: 'numeric' });
  const fMonth = df({ month: 'short' });
  const fWd = df({ weekday: 'short' });
  const fWdLong = df({ weekday: 'long' });
  const nf = new Intl.NumberFormat(loc, { maximumFractionDigits: 1 });
  const wdDate = (dow: number) => dateOf(dnOf(2023, 0, 1 + dow)); // 1 Jan 2023 was a Sunday
  const t: T = ((k: Key, ...a: unknown[]) => {
    const v = (dict[k] ?? (en as unknown as Dict)[k]) as unknown;
    return typeof v === 'function' ? (v as (...x: unknown[]) => string)(...a) : String(v);
  }) as T;
  const f: Formatters = {
    short: (n) => fShort.format(dateOf(n)),
    day: (n) => fDay.format(dateOf(n)),
    long: (n) => fLong.format(dateOf(n)),
    range: (a, b) => {
      try {
        return fRange.formatRange(dateOf(a), dateOf(b));
      } catch {
        return `${fShort.format(dateOf(a))} – ${fRange.format(dateOf(b))}`;
      }
    },
    month: (m0) => fMonth.format(dateOf(dnOf(2023, m0, 1))),
    wd2: (dow) => fWd.format(wdDate(dow)).replace('.', '').slice(0, 2),
    wdLong: (dow) => fWdLong.format(wdDate(dow)),
    dur: (m) => {
      m = Math.round(m);
      const h = Math.floor(m / 60), r = m % 60;
      return h ? (r ? `${h} h ${String(r).padStart(2, '0')}` : `${h} h`) : `${r} min`;
    },
    hrs: (m) => `${nf.format(Math.round(m / 6) / 10)} h`,
    number: (x) => nf.format(x),
  };
  return {
    lang,
    t,
    f,
    holiday: (k, region) => (lang === 'de' && HOL_REGIONAL[region]?.[k]) || HOL[lang][k],
  };
}
