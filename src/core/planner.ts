// The planner: fixed daily blocks first, then each exam's hours spread over its prep window and
// packed into deep (90 min) and focus (45 min) blocks that fit the free slots. Pure function of the data.
import { cardsFor, type CardsDay } from './cards';
import { dn, isISO, isoOf, num, todayDn, toMin, weekKey } from './dates';
import { COUNTED, SIZES } from './defaults';
import { placeFirst, placeLast, type Iv } from './intervals';
import { countsBusy, dayInfo, type DayInfo } from './timetable';
import type { AppData, DatedExam, Exam, ModType } from './types';

export interface Mod {
  id: string;
  d: string;
  type: ModType;
  s: number | null;
  e: number | null;
  min: number;
  exam?: string;
  code?: string;
  part?: number;
  done?: boolean;
  logged?: boolean;
  note?: string;
}

export interface PlanDay {
  n: number;
  info: DayInfo;
  cards: CardsDay;
  free: Iv[];
  mods: Mod[];
  avail: number;
  avail0: number;
  examToday: string | null;
  finalFor: string | null;
  finalMin: number;
}

export interface ExamMeta {
  start: number;
  end: number;
  nominal: number;
  need0: number;
  need: number;
  finalMin: number;
  capacity: number;
  extended: boolean;
}

export type ExamStatus = 'ok' | 'tight' | 'short' | 'past' | 'nodate';

export interface ExamStat {
  need: number;
  done: number;
  doneBefore: number;
  planned: number;
  projected: number;
  dn: number | null;
  meta: ExamMeta | null;
  status: ExamStatus;
}

export interface Plan {
  T: number;
  start: number;
  days: Map<number, PlanDay>;
  stats: Record<string, ExamStat>;
  meta: Record<string, ExamMeta>;
  upcoming: DatedExam[];
  dated: DatedExam[];
  last: number;
}

export const datedExams = (data: AppData): DatedExam[] =>
  data.exams.filter((e) => isISO(e.date)).map((e) => ({ ...e, dn: dn(e.date) }));

/** Day from which exam flashcard decks are spread: the setting, else the day the data was created. */
export function cardsStart(data: AppData): number {
  const st = data.settings;
  if (isISO(st.startDate)) return dn(st.startDate);
  return todayDn(new Date(data.meta?.createdAt || Date.now()));
}

export function buildPlan(data: AppData, T: number): Plan {
  const st = data.settings;
  const focus = Math.max(20, num(st.focusMin, 45));
  const deep = Math.max(focus, num(st.deepMin, 90));
  const brk = Math.max(0, num(st.breakMin, 15));
  const pace = 1 + Math.max(0, num(st.pace, 10)) / 100;
  const dated = datedExams(data);
  const upcoming = dated.filter((e) => e.dn >= T).sort((a, b) => a.dn - b.dn);
  const start = cardsStart(data);

  const doneBefore: Record<string, number> = {};
  const doneAll: Record<string, number> = {};
  for (const wk in data.done) {
    const items = (data.done[wk] || { items: {} }).items || {};
    for (const id in items) {
      const it = items[id];
      if (!it || !it.x || !COUNTED.has(it.t) || !isISO(it.d)) continue;
      const m = num(it.min);
      doneAll[it.x] = (doneAll[it.x] || 0) + m;
      if (dn(it.d) < T) doneBefore[it.x] = (doneBefore[it.x] || 0) + m;
    }
  }

  const last = Math.max(T + 70, ...upcoming.map((e) => e.dn + 3));
  const days = new Map<number, PlanDay>();
  for (let n = T; n <= last; n++) {
    const info = dayInfo(data, n);
    const cards = cardsFor(st, data.decks, n, dated, start);
    const free: Iv[] = info.free.map((iv) => [iv[0], iv[1]] as Iv);
    const mods: Mod[] = [];
    const examToday = dated.find((e) => e.dn === n) || null;
    const examTomorrow = upcoming.find((e) => e.dn === n + 1) || null;
    const afterExam = dated.find((e) => e.dn === n - 1) || null;
    const push = (type: ModType, iv: Iv | null, min: number, extra: Partial<Mod> = {}) =>
      mods.push({ id: '', d: '', type, s: iv ? iv[0] : null, e: iv ? iv[1] : null, min, ...extra });

    let revEnd = -Infinity;
    if (cards.on) {
      const rev = examToday ? Math.min(15, cards.reviews) : cards.reviews;
      const r1 = placeFirst(free, rev);
      if (r1) {
        push('rev', r1, rev);
        revEnd = r1[1];
      } else if (rev > 20) {
        const a1 = Math.ceil(rev / 2), a2 = rev - a1;
        const p1 = placeFirst(free, a1);
        const p2 = p1 ? placeFirst(free, a2) : null;
        push('rev', p1, a1, { part: 1 });
        push('rev', p2, a2, { part: 2 });
        revEnd = (p2 || p1 || [0, -Infinity])[1];
      } else push('rev', null, rev);
    }

    if (st.followUp && st.followUp.on && !examToday && info.classMin >= num(st.followUp.minClassH, 3) * 60) {
      const by: Record<string, number> = {};
      for (const x of info.cls.items) if (countsBusy(st, x)) by[x.t] = (by[x.t] || 0) + (toMin(x.e) - toMin(x.s));
      const code = Object.keys(by).sort((a, b) => by[b] - by[a])[0] ?? '';
      const lastEnd = Math.max(...info.cls.items.filter((x) => x.t === code).map((x) => toMin(x.e)));
      const m = num(st.followUp.min, 30);
      const course = (st.courses || {})[code] || {};
      push('fu', placeFirst(free, m, { after: lastEnd + num(st.bufferAfter) }) || placeFirst(free, m), m, {
        exam: course.exam || '',
        code,
      });
    }

    if (cards.on && !examToday && cards.learn >= 5) {
      push(
        'new',
        placeFirst(free, cards.learn, { after: Math.max(12 * 60, revEnd) }) ||
          placeFirst(free, cards.learn, { after: revEnd }) ||
          placeFirst(free, cards.learn),
        cards.learn,
      );
    }

    if (st.weekly && st.weekly.on && info.w === num(st.weekly.dow, 0)) {
      const m = num(st.weekly.min, 30);
      push('wr', placeLast(free, m, { minStart: 16 * 60 }) || placeLast(free, m), m);
    }

    const fixed = mods.reduce((a, x) => a + x.min, 0);
    let budget = Math.max(0, info.cap - fixed);
    if (examToday) budget = 0;
    else if (afterExam) budget = Math.floor(budget / 2);
    const units = free.reduce((a, [s, e]) => a + Math.floor((e - s + brk) / (focus + brk)), 0);
    const avail = Math.min(budget, units * focus);
    const d: PlanDay = { n, info, cards, free, mods, avail, avail0: avail, examToday: examToday ? examToday.id : null, finalFor: null, finalMin: 0 };
    if (examTomorrow) {
      d.finalFor = examTomorrow.id;
      d.finalMin = Math.min(avail, 2 * focus);
      d.avail = 0;
      d.avail0 = 0;
    }
    days.set(n, d);
  }

  // Pass 1: spread each exam's remaining hours over its prep window, in proportion to free time; nearest exam first.
  const res: Record<string, Record<number, number>> = {};
  const meta: Record<string, ExamMeta> = {};
  for (const e of upcoming) {
    const need0 = Math.max(0, num(e.hours) * 60 - (doneBefore[e.id] || 0));
    const fd = days.get(e.dn - 1);
    const finalMin = fd && fd.finalFor === e.id ? fd.finalMin : 0;
    const need = Math.max(0, need0 - finalMin);
    const weeks = Math.max(1, num(e.weeks, (SIZES[e.size] || SIZES.M).weeks));
    const end = e.dn - 2;
    const nominal = e.dn - weeks * 7;
    let s = Math.max(T, nominal);
    let tot = 0;
    for (let n = s; n <= end; n++) tot += (days.get(n) || { avail: 0 }).avail;
    if (st.autoExtend) {
      while (s > T && tot < need * pace) {
        s--;
        tot += (days.get(s) || { avail: 0 }).avail;
      }
    }
    const r: Record<number, number> = {};
    if (tot > 0 && need > 0 && end >= s) {
      const f = Math.min(1, (need * pace) / tot);
      for (let n = s; n <= end; n++) {
        const d = days.get(n);
        if (!d || d.avail <= 0) continue;
        const x = d.avail * f;
        r[n] = x;
        d.avail -= x;
      }
    }
    res[e.id] = r;
    meta[e.id] = { start: s, end, nominal, need0, need, finalMin, capacity: tot, extended: s < nominal };
  }

  // Pass 2: turn reservations into deep/focus blocks that fit the free slots.
  const carry: Record<string, number> = {};
  const planned: Record<string, number> = {};
  for (let n = T; n <= last; n++) {
    const d = days.get(n)!;
    if (d.finalFor && d.finalMin >= 30) {
      let left = d.finalMin;
      while (left >= 30) {
        const len = Math.min(left, focus);
        const iv = placeFirst(d.free, len, { gap: brk });
        if (!iv) break;
        d.mods.push({ id: '', d: '', type: 'final', exam: d.finalFor, s: iv[0], e: iv[1], min: len });
        planned[d.finalFor] = (planned[d.finalFor] || 0) + len;
        left -= len;
      }
    }
    let placed = 0;
    const limit = d.avail0 + 10;
    for (const e of upcoming) {
      if (n > e.dn - 2) continue;
      carry[e.id] = (carry[e.id] || 0) + ((res[e.id] || {})[n] || 0);
      while (carry[e.id] >= focus * 0.8 && placed + focus <= limit) {
        let len = carry[e.id] >= deep * 0.85 && placed + deep <= limit ? deep : focus;
        let iv = placeFirst(d.free, len, { gap: brk });
        if (!iv && len === deep) {
          len = focus;
          iv = placeFirst(d.free, len, { gap: brk });
        }
        if (!iv) break;
        d.mods.push({ id: '', d: '', type: len === deep ? 'deep' : 'focus', exam: e.id, s: iv[0], e: iv[1], min: len });
        carry[e.id] -= len;
        placed += len;
        planned[e.id] = (planned[e.id] || 0) + len;
      }
    }
  }

  for (const d of days.values()) {
    d.mods.sort((a, b) => (a.s ?? -1) - (b.s ?? -1));
    const c: Record<string, number> = {};
    const iso = isoOf(d.n);
    for (const m of d.mods) {
      const k = `${m.type}_${m.exam || 'x'}`;
      c[k] = c[k] || 0;
      m.id = `${iso}_${k}_${c[k]++}`;
      m.d = iso;
    }
  }

  const stats: Record<string, ExamStat> = {};
  for (const e of data.exams) {
    const x = dated.find((y) => y.id === e.id);
    const need = num(e.hours) * 60;
    const s: ExamStat = {
      need,
      done: doneAll[e.id] || 0,
      doneBefore: doneBefore[e.id] || 0,
      planned: planned[e.id] || 0,
      projected: 0,
      dn: x ? x.dn : null,
      meta: meta[e.id] || null,
      status: 'nodate',
    };
    s.projected = s.doneBefore + s.planned;
    s.status = !x ? 'nodate' : x.dn < T ? 'past' : need <= 0 || s.projected >= need * 0.97 ? 'ok' : s.projected >= need * 0.85 ? 'tight' : 'short';
    stats[e.id] = s;
  }
  return { T, start, days, stats, meta, upcoming, dated, last };
}

export interface DayView {
  n: number;
  iso: string;
  info: DayInfo;
  mods: Mod[];
  extras: Mod[];
  free: Iv[];
  exam: Exam | null;
  pd: PlanDay | null;
}

/** A day as shown: planned blocks with their ticks (future) or what was logged (past). */
export function dayView(data: AppData, plan: Plan, n: number): DayView {
  const iso = isoOf(n);
  const items = (data.done[weekKey(n)] || { items: {} }).items || {};
  const doneHere = Object.entries(items).filter(([, it]) => it && it.d === iso);
  const doneIds = new Set(doneHere.map(([id]) => id));
  const pd = n >= plan.T ? plan.days.get(n) || null : null;
  const logged = ([id, it]: [string, (typeof items)[string]]): Mod => ({
    id,
    d: iso,
    type: it.t,
    exam: it.x || '',
    code: it.c || '',
    s: Number.isFinite(it.s) ? (it.s as number) : null,
    e: Number.isFinite(it.e) ? (it.e as number) : null,
    min: num(it.min),
    done: true,
    logged: true,
  });
  let info: DayInfo;
  let mods: Mod[];
  let free: Iv[] = [];
  if (pd) {
    info = pd.info;
    free = pd.free;
    mods = pd.mods.map((m) => ({ ...m, done: doneIds.has(m.id) }));
    const planIds = new Set(pd.mods.map((m) => m.id));
    for (const pair of doneHere) if (pair[1].t !== 'x' && !planIds.has(pair[0])) mods.push(logged(pair));
    mods.sort((a, b) => (a.s ?? -1) - (b.s ?? -1));
  } else {
    info = dayInfo(data, n);
    mods = doneHere.filter(([, it]) => it.t !== 'x').map(logged).sort((a, b) => (a.s ?? -1) - (b.s ?? -1));
  }
  const extras: Mod[] = doneHere
    .filter(([, it]) => it.t === 'x')
    .map(([id, it]) => ({ id, d: iso, type: 'x' as ModType, s: null, e: null, exam: it.x || '', min: num(it.min), note: it.note || '', done: true, logged: true }));
  const exam = data.exams.find((e) => e.date === iso) || null;
  return { n, iso, info, mods, extras, free, exam, pd };
}

export interface WeekTotals { classes: number; study: number; cards: number; by: Record<string, number> }

export function weekTotals(data: AppData, plan: Plan, mon: number): WeekTotals {
  const t: WeekTotals = { classes: 0, study: 0, cards: 0, by: {} };
  for (let i = 0; i < 7; i++) {
    const v = dayView(data, plan, mon + i);
    t.classes += v.info.classMin;
    for (const m of v.mods.concat(v.extras)) {
      if (m.type === 'rev' || m.type === 'new') {
        t.cards += m.min;
        continue;
      }
      t.study += m.min;
      if (m.exam) t.by[m.exam] = (t.by[m.exam] || 0) + m.min;
    }
  }
  return t;
}

/** Consecutive days (ending today, or yesterday if today has nothing yet) with at least one ticked item. */
export function streak(data: AppData, T: number): number {
  const has = (n: number) => {
    const iso = isoOf(n);
    return Object.values((data.done[weekKey(n)] || { items: {} }).items || {}).some((it) => it && it.d === iso);
  };
  let n = has(T) ? T : T - 1;
  let s = 0;
  while (has(n) && s < 1000) {
    s++;
    n--;
  }
  return s;
}

export const cardsAt = (data: AppData, plan: Plan, n: number): CardsDay => {
  const pd = n >= plan.T ? plan.days.get(n) : null;
  return pd ? pd.cards : cardsFor(data.settings, data.decks, n, plan.dated, plan.start);
};
