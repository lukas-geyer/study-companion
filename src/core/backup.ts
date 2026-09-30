// Backups (JSON) and normalising any stored/imported data into the current shape.
import { APP_ID, DATA_VERSION } from '../config';
import { isISO, num } from './dates';
import { defaultSettings, PALETTE, SIZES } from './defaults';
import type { AppData, DoneDoc, Exam, PaletteKey, Settings, Size, TplSlot, WeekDoc } from './types';

type Json = Record<string, unknown>;
const isObj = (x: unknown): x is Json => !!x && typeof x === 'object' && !Array.isArray(x);

function merge<T>(base: T, over: unknown): T {
  if (over === undefined || over === null) return structuredClone(base);
  if (Array.isArray(base) || Array.isArray(over)) return structuredClone(over) as T;
  if (isObj(base) && isObj(over)) {
    const out: Json = structuredClone(base) as Json;
    for (const k of Object.keys(over)) out[k] = k in (base as Json) ? merge((base as Json)[k], over[k]) : structuredClone(over[k]);
    return out as T;
  }
  return typeof over === typeof base ? (over as T) : structuredClone(base);
}

function normSettings(raw: unknown): Settings {
  const r: Json = isObj(raw) ? { ...raw } : {};
  // Legacy planner: "anki" → "cards"
  if (isObj(r.anki) && !isObj(r.cards)) r.cards = { on: true, ...r.anki };
  delete r.anki;
  // Legacy template: [["08:15","12:00"], …] → [{from,to}]
  if (isObj(r.template)) {
    const t: Record<string, TplSlot[]> = {};
    for (const [k, v] of Object.entries(r.template)) {
      t[k] = Array.isArray(v)
        ? v.map((x) => (Array.isArray(x) ? { from: String(x[0]), to: String(x[1]) } : isObj(x) ? { from: String(x.from || ''), to: String(x.to || ''), title: x.title ? String(x.title) : '' } : null)).filter((x): x is TplSlot => !!x)
        : [];
    }
    r.template = t;
  }
  const s = merge(defaultSettings(), r);
  for (const d of ['0', '1', '2', '3', '4', '5', '6']) if (!Array.isArray(s.template[d])) s.template[d] = [];
  if (!['AT', 'DE', 'CH', 'none'].includes(s.region)) s.region = 'none';
  if (!['auto', 'en', 'de'].includes(s.lang)) s.lang = 'auto';
  if (!['auto', 'light', 'dark'].includes(s.theme)) s.theme = 'auto';
  return s;
}

function normExam(raw: unknown, i: number, used: Set<string>): Exam | null {
  if (!isObj(raw)) return null;
  const size: Size = raw.size === 'S' || raw.size === 'L' ? raw.size : 'M';
  let color = String(raw.color || '') as PaletteKey;
  if (!PALETTE.includes(color)) color = PALETTE.find((c) => !used.has(c)) || PALETTE[i % PALETTE.length];
  used.add(color);
  return {
    id: String(raw.id || `ex-${i + 1}`),
    name: String(raw.name || ''),
    short: String(raw.short || ''),
    date: isISO(raw.date) ? raw.date : '',
    size,
    hours: Math.max(0, num(raw.hours, SIZES[size].hours)),
    weeks: Math.max(1, num(raw.weeks, SIZES[size].weeks)),
    cards: Math.max(0, num(raw.cards)),
    newPerDay: Math.max(0, num(raw.newPerDay)),
    color,
    order: num(raw.order, i + 1),
  };
}

export function normalize(raw: unknown): AppData {
  const r: Json = isObj(raw) ? raw : {};
  const used = new Set<string>();
  const exams = (Array.isArray(r.exams) ? r.exams : isObj(r.exams) ? Object.entries(r.exams).map(([id, e]) => ({ ...(e as Json), id })) : [])
    .map((e, i) => normExam(e, i, used))
    .filter((e): e is Exam => !!e)
    .sort((a, b) => a.order - b.order);
  const weeks: Record<string, WeekDoc> = {};
  if (isObj(r.weeks)) for (const [k, v] of Object.entries(r.weeks)) if (isObj(v) && Array.isArray(v.items)) weeks[k] = { items: v.items as WeekDoc['items'], src: v.src ? String(v.src) : undefined };
  const done: Record<string, DoneDoc> = {};
  if (isObj(r.done)) for (const [k, v] of Object.entries(r.done)) if (isObj(v) && isObj(v.items)) done[k] = { items: v.items as DoneDoc['items'] };
  const meta = isObj(r.meta) ? r.meta : {};
  return {
    v: DATA_VERSION,
    settings: normSettings(r.settings),
    exams,
    weeks,
    done,
    meta: { onboarded: meta.onboarded !== false, createdAt: num(meta.createdAt, Date.now()), example: !!meta.example },
  };
}

export function toBackup(data: AppData): string {
  return JSON.stringify({ app: APP_ID, kind: 'backup', v: DATA_VERSION, exportedAt: new Date().toISOString(), data }, null, 1);
}

/** Accepts our backup files and plain data objects (also the legacy planner's collections). */
export function fromBackup(text: string): AppData {
  let j: unknown;
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error('not-json');
  }
  if (!isObj(j)) throw new Error('not-backup');
  const body = isObj(j.data) ? j.data : j;
  if (!('settings' in body) && !('exams' in body)) throw new Error('not-backup');
  const d = normalize(body);
  d.meta.onboarded = true;
  return d;
}
