// What a single day looks like: classes, free slots and how much study it can hold.
import { dn, dowOf, isISO, isoOf, num, toMin, weekKey } from './dates';
import { holidayOn, type HolidayKey } from './holidays';
import { mergeIv, subtractIv, type Iv } from './intervals';
import type { AppData, Break, DayType, Settings, TtItem } from './types';

export interface DayInfo {
  n: number;
  w: number;
  weekend: boolean;
  cls: { items: TtItem[]; est: boolean };
  busy: Iv[];
  classMin: number;
  free: Iv[];
  freeMin: number;
  type: DayType;
  cap: number;
  holiday: HolidayKey | null;
  brk: Break | null;
}

function inBreak(st: Settings, n: number): Break | null {
  for (const b of st.breaks || []) if (isISO(b.from) && isISO(b.to) && n >= dn(b.from) && n <= dn(b.to)) return b;
  return null;
}

export function countsBusy(st: Settings, x: TtItem): boolean {
  const c = (st.courses || {})[x.t];
  if (c && c.busy === false) return false;
  if (x.tent && !st.tentativeBusy) return false;
  return true;
}

const validItem = (x: TtItem | null | undefined): x is TtItem =>
  !!x && Number.isFinite(toMin(x.s)) && Number.isFinite(toMin(x.e)) && toMin(x.e) > toMin(x.s);

/**
 * Classes on day n. Imported weeks are exact up to settings.knownUntil; after that (or without an
 * import) the typical week fills in, except on public holidays and in breaks. The user's own
 * appointments (m) always count.
 */
function classesFor(data: AppData, n: number): { items: TtItem[]; est: boolean } {
  const st = data.settings;
  const iso = isoOf(n);
  const items = ((data.weeks[weekKey(n)] || { items: [] }).items || []).filter((x) => validItem(x) && x.d === iso);
  const imported = isISO(st.knownUntil);
  if (imported && n <= dn(st.knownUntil)) return { items, est: false };
  const manual = items.filter((x) => x.m);
  if (holidayOn(st.region, n) || inBreak(st, n)) return { items: manual, est: false };
  const tpl: TtItem[] = ((st.template || {})[String(dowOf(n))] || [])
    .filter((p) => p && Number.isFinite(toMin(p.from)) && Number.isFinite(toMin(p.to)) && toMin(p.to) > toMin(p.from))
    .map((p) => ({ d: iso, s: p.from, e: p.to, t: (p.title || '').trim(), est: imported }));
  return { items: tpl.concat(manual), est: imported && tpl.length > 0 };
}

export function dayInfo(data: AppData, n: number): DayInfo {
  const st = data.settings;
  const w = dowOf(n);
  const weekend = w === 0 || w === 6;
  const cls = classesFor(data, n);
  const busy = mergeIv(cls.items.filter((x) => countsBusy(st, x)).map((x) => [toMin(x.s), toMin(x.e)] as Iv));
  const classMin = busy.reduce((a, [s, e]) => a + e - s, 0);
  const win: Iv = weekend ? [toMin(st.weekendStart), toMin(st.weekendEnd)] : [toMin(st.dayStart), toMin(st.dayEnd)];
  const blocks: Iv[] = busy.map(([s, e]) => [s - num(st.bufferBefore), e + num(st.bufferAfter)] as Iv);
  for (const ml of st.meals || []) blocks.push([toMin(ml.from), toMin(ml.to)]);
  for (const r of st.rest || []) if (num(r.dow, -1) === w) blocks.push([toMin(r.from), toMin(r.to)]);
  const valid = blocks.filter((b) => Number.isFinite(b[0]) && Number.isFinite(b[1]));
  const free = (Number.isFinite(win[0]) && Number.isFinite(win[1]) ? subtractIv(win, mergeIv(valid)) : []).filter(
    ([s, e]) => e - s >= num(st.minSlot, 20),
  );
  const freeMin = free.reduce((a, [s, e]) => a + e - s, 0);
  const type: DayType =
    classMin === 0 ? (w === 6 ? 'sat' : w === 0 ? 'sun' : 'free') : classMin <= num(st.halfThreshold, 4.5) * 60 ? 'half' : 'full';
  const cap = Math.round(num((st.caps || ({} as Settings['caps']))[type], 3) * 60);
  return { n, w, weekend, cls, busy, classMin, free, freeMin, type, cap, holiday: holidayOn(st.region, n), brk: inBreak(st, n) };
}

export interface DisplayClass {
  t: string;
  name: string;
  s0: number;
  e0: number;
  units: number;
  on: boolean;
  tent: boolean;
  est: boolean;
  m: boolean;
  raw: TtItem;
}

/** Merge back-to-back units of the same course into one bar. */
export function displayClasses(items: TtItem[]): DisplayClass[] {
  const arr = items.map((x) => ({ x, s0: toMin(x.s), e0: toMin(x.e) })).sort((a, b) => a.s0 - b.s0);
  const out: DisplayClass[] = [];
  for (const { x, s0, e0 } of arr) {
    const l = out[out.length - 1];
    if (l && !l.m && !x.m && l.t === x.t && l.tent === !!x.tent && s0 - l.e0 <= 20) {
      l.e0 = Math.max(l.e0, e0);
      l.units++;
      continue;
    }
    out.push({ t: x.t || '', name: x.n || '', s0, e0, units: 1, on: !!x.on, tent: !!x.tent, est: !!x.est, m: !!x.m, raw: { ...x } });
  }
  return out;
}
