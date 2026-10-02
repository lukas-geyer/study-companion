import { DATA_VERSION } from '../config';
import type { AppData, Exam, ModType, PaletteKey, Region, Settings, Size } from './types';

export const PALETTE: PaletteKey[] = ['lav', 'butter', 'peach', 'rose', 'mint', 'sky', 'apricot', 'sage', 'lilac'];
export const SIZES: Record<Size, { hours: number; weeks: number }> = {
  S: { hours: 25, weeks: 3 },
  M: { hours: 40, weeks: 5 },
  L: { hours: 60, weeks: 8 },
};
/** Block types whose minutes count toward an exam's hours. */
export const COUNTED: ReadonlySet<ModType> = new Set<ModType>(['deep', 'focus', 'final', 'fu', 'x']);
export const GLYPH: Record<ModType, string> = { deep: '◆', focus: '◇', final: '✦', fu: '↺', rev: '↻', new: '+', wr: '✎︎', x: '+' };
export const MAX_EXAMS = 24;

export function defaultSettings(region: Region = 'none'): Settings {
  return {
    lang: 'auto',
    theme: 'auto',
    region,
    termName: '',
    startDate: '',
    knownUntil: '',
    dayStart: '08:00',
    dayEnd: '21:00',
    weekendStart: '09:00',
    weekendEnd: '19:00',
    bufferBefore: 10,
    bufferAfter: 15,
    minSlot: 20,
    breakMin: 15,
    meals: [
      { label: '', from: '12:00', to: '12:45' },
      { label: '', from: '18:30', to: '19:15' },
    ],
    rest: [{ label: '', dow: 6, from: '16:00', to: '23:59' }],
    caps: { free: 6, half: 4, full: 2, sat: 5, sun: 3 },
    halfThreshold: 4.5,
    deepMin: 90,
    focusMin: 45,
    pace: 10,
    autoExtend: true,
    followUp: { on: true, min: 30, minClassH: 3 },
    weekly: { on: true, dow: 0, min: 30 },
    cards: { on: false, reviewBase: 20, generalName: '', generalNew: 0, throttle: true, override: 0 },
    template: { '0': [], '1': [], '2': [], '3': [], '4': [], '5': [], '6': [] },
    breaks: [],
    courses: {},
    tentativeBusy: true,
    reminders: { morning: false, morningAt: '07:30', before: false, beforeMin: 10, evening: false, eveningAt: '20:30', exam: false, examDays: 3 },
  };
}

export function newId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function makeExam(existing: Exam[], init: Partial<Exam> = {}): Exam {
  const used = new Set(existing.map((e) => e.color));
  const color = PALETTE.find((c) => !used.has(c)) || PALETTE[existing.length % PALETTE.length];
  const size: Size = init.size || 'M';
  return {
    id: newId('ex'),
    name: '',
    short: '',
    date: '',
    size,
    hours: SIZES[size].hours,
    weeks: SIZES[size].weeks,
    cards: 0,
    newPerDay: 0,
    color,
    order: Math.max(0, ...existing.map((x) => x.order || 0)) + 1,
    ...init,
  };
}

export function newAppData(region: Region = 'none'): AppData {
  return {
    v: DATA_VERSION,
    settings: defaultSettings(region),
    exams: [],
    weeks: {},
    done: {},
    meta: { onboarded: false, createdAt: Date.now() },
  };
}
