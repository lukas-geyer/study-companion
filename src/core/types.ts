export type PaletteKey = 'lav' | 'butter' | 'peach' | 'rose' | 'mint' | 'sky' | 'apricot' | 'sage' | 'lilac';
export type Region = 'AT' | 'DE' | 'CH' | 'none';
export type Lang = 'en' | 'de';
export type DayType = 'free' | 'half' | 'full' | 'sat' | 'sun';
export type Size = 'S' | 'M' | 'L';
export type ModType = 'rev' | 'new' | 'fu' | 'wr' | 'deep' | 'focus' | 'final' | 'x';

export interface Meal { label: string; from: string; to: string }
export interface Rest { label: string; dow: number; from: string; to: string }
export interface Break { label: string; from: string; to: string }
export interface Course { name?: string; exam?: string; busy?: boolean }
/** Optional notifications in the iOS app; each one is switched on separately. Times are "HH:MM". */
export interface Reminders {
  morning: boolean;
  morningAt: string;
  before: boolean;
  beforeMin: number;
  evening: boolean;
  eveningAt: string;
  exam: boolean;
  examDays: number;
}
/** One recurring class in the typical week. */
export interface TplSlot { from: string; to: string; title?: string }

export interface Settings {
  lang: 'auto' | Lang;
  theme: 'auto' | 'light' | 'dark';
  region: Region;
  termName: string;
  /** Day from which exam flashcard decks are spread (empty = today). */
  startDate: string;
  /** Last day covered by an imported timetable (empty = none imported). */
  knownUntil: string;
  dayStart: string;
  dayEnd: string;
  weekendStart: string;
  weekendEnd: string;
  bufferBefore: number;
  bufferAfter: number;
  minSlot: number;
  breakMin: number;
  meals: Meal[];
  rest: Rest[];
  caps: Record<DayType, number>;
  halfThreshold: number;
  deepMin: number;
  focusMin: number;
  pace: number;
  autoExtend: boolean;
  followUp: { on: boolean; min: number; minClassH: number };
  weekly: { on: boolean; dow: number; min: number };
  cards: { on: boolean; reviewBase: number; generalName: string; generalNew: number; throttle: boolean; override: number };
  /** Typical week, keyed by day of week "0" (Sunday) … "6". */
  template: Record<string, TplSlot[]>;
  breaks: Break[];
  courses: Record<string, Course>;
  tentativeBusy: boolean;
  reminders: Reminders;
}

export interface Exam {
  id: string;
  name: string;
  short: string;
  date: string;
  size: Size;
  hours: number;
  weeks: number;
  cards: number;
  newPerDay: number;
  color: PaletteKey;
  order: number;
}
export interface DatedExam extends Exam { dn: number }

/** A timetable entry: d = ISO date, s/e = "HH:MM", t = course code/short title, n = full title. */
export interface TtItem {
  d: string;
  s: string;
  e: string;
  t: string;
  n?: string;
  m?: boolean; // the user's own appointment
  on?: boolean; // online
  tent?: boolean; // tentative in the source calendar
  est?: boolean; // estimated from the typical week
}
export interface WeekDoc { items: TtItem[]; src?: string }

export interface DoneItem {
  d: string;
  t: ModType;
  x?: string;
  c?: string;
  min: number;
  s?: number | null;
  e?: number | null;
  note?: string;
  at?: number;
}
export interface DoneDoc { items: Record<string, DoneItem> }

export interface AppMeta { onboarded: boolean; createdAt: number; example?: boolean }

export interface AppData {
  v: number;
  settings: Settings;
  exams: Exam[];
  weeks: Record<string, WeekDoc>;
  done: Record<string, DoneDoc>;
  meta: AppMeta;
}
