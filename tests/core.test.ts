import { describe, expect, test } from 'bun:test';
import { DATA_VERSION } from '../src/config';
import { fromBackup, normalize, toBackup } from '../src/core/backup';
import { cardsFor } from '../src/core/cards';
import { dn, dowOf, isoOf, kwOf, monOf, toMin, weekKey } from '../src/core/dates';
import { makeDeck, makeExam, newAppData } from '../src/core/defaults';
import { exampleData } from '../src/core/example';
import { easterSunday, holidayOn } from '../src/core/holidays';
import { applyICS, previewICS } from '../src/core/ics';
import { planToICS } from '../src/core/icsExport';
import { mergeIv, placeFirst, subtractIv } from '../src/core/intervals';
import { buildPlan, dayView, streak, weekTotals } from '../src/core/planner';
import { MAX_REMINDERS, plannedReminders } from '../src/core/reminders';
import { dayInfo } from '../src/core/timetable';

const T = dn('2026-10-05'); // a Monday

describe('dates', () => {
  test('ISO weeks and Mondays', () => {
    expect(weekKey(dn('2026-10-05'))).toBe('2026-W41');
    expect(weekKey(dn('2027-01-01'))).toBe('2026-W53');
    expect(kwOf(dn('2027-01-04'))).toBe(1);
    expect(isoOf(monOf(dn('2026-10-11')))).toBe('2026-10-05');
    expect(dowOf(T)).toBe(1);
  });
});

describe('intervals', () => {
  test('merge, subtract, place', () => {
    expect(mergeIv([[60, 120], [100, 180], [200, 210]])).toEqual([[60, 180], [200, 210]]);
    expect(subtractIv([0, 300], [[60, 180]])).toEqual([[0, 60], [180, 300]]);
    const free: [number, number][] = [[0, 100], [200, 400]];
    expect(placeFirst(free, 90, { gap: 15 })).toEqual([0, 90]);
    expect(placeFirst(free, 90)).toEqual([200, 290]);
  });
});

describe('holidays', () => {
  test('Easter and regional days', () => {
    expect(isoOf(easterSunday(2027))).toBe('2027-03-28');
    expect(isoOf(easterSunday(2026))).toBe('2026-04-05');
    expect(holidayOn('AT', dn('2026-10-26'))).toBe('austrianNational');
    expect(holidayOn('DE', dn('2026-10-03'))).toBe('germanUnity');
    expect(holidayOn('DE', dn('2026-10-26'))).toBe(null);
    expect(holidayOn('AT', dn('2027-03-29'))).toBe('easterMonday');
    expect(holidayOn('none', dn('2026-12-25'))).toBe(null);
  });
});

describe('planner', () => {
  const data = exampleData('en', 'AT', T);
  const plan = buildPlan(data, T);

  test('blocks never overlap classes, meals or each other and stay inside the study window', () => {
    for (const d of plan.days.values()) {
      const st = data.settings;
      const win = d.info.weekend ? [toMin(st.weekendStart), toMin(st.weekendEnd)] : [toMin(st.dayStart), toMin(st.dayEnd)];
      const timed = d.mods.filter((m) => m.s != null).map((m) => [m.s!, m.e!] as [number, number]).sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < timed.length; i++) expect(timed[i][0]).toBeGreaterThanOrEqual(timed[i - 1][1]);
      for (const [s, e] of timed) {
        expect(s).toBeGreaterThanOrEqual(win[0]);
        expect(e).toBeLessThanOrEqual(win[1]);
        for (const [bs, be] of d.info.busy) expect(e <= bs || s >= be).toBe(true);
      }
    }
  });

  test('exams get most of their hours and a status', () => {
    const pm4 = plan.stats['ex-pm4'];
    expect(pm4.status === 'ok' || pm4.status === 'tight').toBe(true);
    expect(pm4.projected).toBeGreaterThan(pm4.need * 0.8);
    expect(plan.stats['ex-bioch'].status).toBe('nodate');
  });

  test('exam day has no study blocks, the day before a final review', () => {
    const ex = plan.upcoming[0];
    const dayOf = plan.days.get(ex.dn)!;
    expect(dayOf.mods.some((m) => m.type === 'deep' || m.type === 'focus')).toBe(false);
    const before = plan.days.get(ex.dn - 1)!;
    expect(before.mods.some((m) => m.type === 'final')).toBe(true);
  });

  test('ids are unique and stable', () => {
    const ids = new Set<string>();
    for (const d of plan.days.values()) for (const m of d.mods) {
      expect(ids.has(m.id)).toBe(false);
      ids.add(m.id);
    }
    const again = buildPlan(data, T);
    expect([...again.days.get(T + 3)!.mods.map((m) => m.id)]).toEqual([...plan.days.get(T + 3)!.mods.map((m) => m.id)]);
  });

  test('day views, week totals, streak', () => {
    const v = dayView(data, plan, T);
    expect(v.mods.length).toBeGreaterThan(0);
    const past = dayView(data, plan, T - 1);
    expect(past.mods.every((m) => m.done)).toBe(true);
    const wk = weekTotals(data, plan, monOf(T));
    expect(wk.study).toBeGreaterThan(0);
    expect(streak(data, T)).toBe(4);
  });

  test('without flashcards there are no card blocks', () => {
    const d2 = structuredClone(data);
    d2.settings.cards.on = false;
    const p2 = buildPlan(d2, T);
    for (const d of p2.days.values()) expect(d.mods.some((m) => m.type === 'rev' || m.type === 'new')).toBe(false);
  });

  test('an empty plan works', () => {
    const empty = newAppData('DE');
    const p = buildPlan(empty, T);
    expect(p.days.size).toBeGreaterThan(60);
    expect(Object.keys(p.stats).length).toBe(0);
  });

  test('holidays and breaks drop typical-week classes', () => {
    const info = dayInfo(data, dn('2026-10-26'));
    expect(info.holiday).toBe('austrianNational');
    expect(info.classMin).toBe(0);
  });
});

describe('ics', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'DTSTART;TZID=Europe/Vienna:20261006T081500',
    'DTEND;TZID=Europe/Vienna:20261006T100000',
    'SUMMARY:ANAT VO Anatomie',
    'RRULE:FREQ=WEEKLY;COUNT=3;BYDAY=TU,TH',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'DTSTART:20261008T130000',
    'DTEND:20261008T150000',
    'SUMMARY:Seminar Zoom',
    'LOCATION:Online (Zoom)',
    'STATUS:TENTATIVE',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  test('parse, expand and apply', () => {
    const p = previewICS(ics)!;
    expect(p.events.length).toBe(4);
    expect(p.codes).toContain('ANAT');
    const seminar = p.events.find((x) => x.t.startsWith('Seminar'))!;
    expect(seminar.on).toBe(true);
    expect(seminar.tent).toBe(true);
    const data = newAppData('AT');
    data.weeks[weekKey(dn('2026-10-06'))] = { items: [{ d: '2026-10-07', s: '10:00', e: '11:00', t: 'Dentist', m: true }] };
    const after = applyICS(data, p);
    expect(after.settings.knownUntil).toBe(isoOf(p.last));
    expect(after.weeks[weekKey(dn('2026-10-06'))].items.some((x) => x.m)).toBe(true);
  });

  test('export', () => {
    const data = exampleData('de', 'AT', T);
    const plan = buildPlan(data, T);
    const text = planToICS(plan, { from: T, to: T + 6, includeCards: false, title: (m) => m.type, description: () => 'x', calendarName: 'Plan' });
    expect(text.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(text.includes('BEGIN:VEVENT')).toBe(true);
    expect(text.includes('rev')).toBe(false);
  });
});

describe('backup', () => {
  test('round trip and legacy shapes', () => {
    const data = exampleData('en', 'AT', T);
    const back = fromBackup(toBackup(data));
    expect(back.exams.length).toBe(data.exams.length);
    expect(back.decks).toEqual(data.decks);
    const legacy = normalize({
      settings: { anki: { generalNew: 12, reviewBase: 25 }, template: { '1': [['08:15', '12:00']] } },
      exams: [{ id: 'fp1', name: 'X', date: '2026-11-05', size: 'L', hours: 60, weeks: 8, color: 'lav' }],
    });
    expect(legacy.settings.cards.on).toBe(true);
    expect(legacy.decks).toEqual([{ id: 'deck-general', name: '', cards: 0, newPerDay: 12, reviews: 25, exam: '' }]);
    expect(legacy.settings.template['1'][0]).toEqual({ from: '08:15', to: '12:00' });
    expect(() => fromBackup('nope')).toThrow();
    expect(makeExam([]).color).toBe('lav');
  });
});

describe('flashcard decks', () => {
  const st = () => {
    const d = newAppData('AT');
    d.settings.cards.on = true;
    return d.settings;
  };
  const exam = { ...makeExam([], { id: 'ex-a', short: 'A', date: isoOf(T + 37) }), dn: T + 37 };

  test('a deck linked to an exam is done a week before it', () => {
    const deck = makeDeck({ cards: 300, exam: 'ex-a' });
    const day = (n: number) => cardsFor(st(), [deck], n, [exam], T).decks[0];
    expect(day(T).per).toBe(10); // 300 cards over the 30 days until a week before the exam
    expect(day(T + 29).per).toBe(10);
    expect(day(T + 30).per).toBe(0); // last week: reviews only
    expect(day(T + 37)).toBeUndefined(); // exam over
  });

  test('decks without an exam keep their own pace, end when done and slow down before exams', () => {
    const deck = makeDeck({ cards: 50, newPerDay: 10, reviews: 15 });
    const far = cardsFor(st(), [deck], T, [], T);
    expect(far.decks[0].per).toBe(10);
    expect(far.reviews).toBe(Math.round(15 + 1.2 * 10));
    expect(cardsFor(st(), [deck], T + 5, [], T).decks).toEqual([]); // 50 cards at 10 a day: done after 5 days
    const open = makeDeck({ newPerDay: 20 });
    expect(cardsFor(st(), [open], T + 20, [exam], T)).toMatchObject({ throttled: 'halved', newTotal: 10 });
    expect(cardsFor(st(), [open], T + 30, [exam], T)).toMatchObject({ throttled: 'paused', newTotal: 0 });
  });

  test('several decks add up; deleting an exam unlinks its deck', () => {
    const d = exampleData('de', 'AT', T);
    const plan = buildPlan(d, T);
    const c = plan.days.get(T)!.cards;
    expect(c.decks.map((x) => x.deck.id)).toEqual(['deck-anatomy', 'deck-pm4']);
    expect(c.newTotal).toBe(c.decks.reduce((s, x) => s + x.per, 0));
    const again = normalize({ ...d, exams: d.exams.filter((e) => e.id !== 'ex-pm4') });
    expect(again.decks.find((x) => x.id === 'deck-pm4')!.exam).toBe('');
  });

  test('data saved before decks existed gets them from the old settings and exams (v2 → v3)', () => {
    const v2 = normalize({
      v: 2,
      settings: { cards: { on: true, reviewBase: 20, generalName: 'Allgemein', generalNew: 10, throttle: true, override: 0 } },
      exams: [
        { id: 'ex-pm4', short: 'PM IV', name: 'Bewegungsapparat', date: '2026-11-25', cards: 1200, newPerDay: 0 },
        { id: 'ex-histo', short: 'HISTO', date: '2027-02-10' },
      ],
    });
    expect(v2.decks).toEqual([
      { id: 'deck-general', name: 'Allgemein', cards: 0, newPerDay: 10, reviews: 20, exam: '' },
      { id: 'deck-ex-pm4', name: 'PM IV', cards: 1200, newPerDay: 0, reviews: 0, exam: 'ex-pm4' },
    ]);
    expect(v2.settings.cards).toEqual({ on: true, throttle: true, override: 0 });
    expect('cards' in v2.exams[0]).toBe(false);
    expect(normalize({ settings: { cards: { on: false } } }).decks).toEqual([]);
  });
});

describe('reminders', () => {
  const setup = () => {
    const d = exampleData('en', 'AT', T);
    d.exams.push(makeExam(d.exams, { id: 'ex-soon', short: 'SOON', date: isoOf(T + 5), hours: 10, weeks: 1 }));
    d.settings.reminders = { morning: true, morningAt: '07:30', before: true, beforeMin: 10, evening: true, eveningAt: '20:30', exam: true, examDays: 3 };
    return d;
  };

  test('nothing when all are off', () => {
    const d = exampleData('en', 'AT', T);
    expect(plannedReminders(d, buildPlan(d, T), T, 8 * 60)).toEqual([]);
  });

  test('morning, before, evening and exam reminders, soonest first, never in the past', () => {
    const d = setup();
    const plan = buildPlan(d, T);
    const nowM = 8 * 60;
    const rs = plannedReminders(d, plan, T, nowM);
    expect(rs.length).toBeGreaterThan(0);
    expect(rs.length).toBeLessThanOrEqual(MAX_REMINDERS);
    for (const r of rs) expect(r.n > T || r.at > nowM).toBe(true);
    for (let i = 1; i < rs.length; i++) expect(rs[i - 1].n * 1440 + rs[i - 1].at <= rs[i].n * 1440 + rs[i].at).toBe(true);
    // today's 07:30 overview has passed; tomorrow's is there
    expect(rs.some((r) => r.kind === 'morning' && r.n === T)).toBe(false);
    expect(rs.some((r) => r.kind === 'morning' && r.n === T + 1 && r.at === 450)).toBe(true);
    // a block reminder comes 10 minutes before its block
    const b = rs.find((r) => r.kind === 'before');
    expect(b && b.kind === 'before' && b.at === (b.mod.s as number) - 10).toBe(true);
    // the exam on T+5 is announced 3 days ahead, at the morning time
    const ex = rs.find((r) => r.kind === 'exam');
    expect(ex && ex.kind === 'exam' ? [ex.n, ex.at, ex.exam.id] : null).toEqual([T + 2, 450, 'ex-soon']);
  });

  test('ticked blocks get no reminders, and a fully ticked day no evening nudge', () => {
    const d = setup();
    const plan = buildPlan(d, T);
    const day = T + 1;
    const doc = (d.done[weekKey(day)] = d.done[weekKey(day)] || { items: {} });
    for (const m of dayView(d, plan, day).mods) doc.items[m.id] = { d: m.d, t: m.type, x: m.exam || '', min: m.min, s: m.s, e: m.e };
    const rs = plannedReminders(d, plan, T, 8 * 60).filter((r) => r.n === day);
    expect(rs.some((r) => r.kind === 'before' || r.kind === 'evening')).toBe(false);
    expect(rs.some((r) => r.kind === 'morning')).toBe(true);
  });

  test('data saved before reminders existed gets them switched off (v1 → v2)', () => {
    const v1 = { v: 1, settings: { dayStart: '08:00' }, exams: [] };
    const d = normalize(v1);
    expect(d.v).toBe(DATA_VERSION);
    expect(d.settings.reminders).toEqual({ morning: false, morningAt: '07:30', before: false, beforeMin: 10, evening: false, eveningAt: '20:30', exam: false, examDays: 3 });
  });
});
