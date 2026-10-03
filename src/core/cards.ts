// Flashcards (e.g. Anki): daily reviews and new cards across the user's decks. A deck linked to an exam is spread so
// its new cards are done a week before the exam; other decks run at their own pace (and slow down before exams).
import { num } from './dates';
import type { DatedExam, Deck, Settings } from './types';

export interface CardsDay {
  on: boolean;
  /** Decks with new cards on this day (per = 0 in an exam deck's last week). exam: the linked, dated exam. */
  decks: { deck: Deck; exam: DatedExam | null; per: number }[];
  newTotal: number;
  /** Minutes. */
  reviews: number;
  /** Minutes. */
  learn: number;
  throttled: '' | 'paused' | 'halved';
  next: DatedExam | null;
  daysTo: number;
}

/** New cards per day for a deck. With a dated exam and no fixed rate: finish `cards` one week before the exam. */
export function deckPerDay(d: Deck, exam: DatedExam | null, start: number): number {
  if (num(d.newPerDay) > 0) return Math.round(num(d.newPerDay));
  if (!exam || !(num(d.cards) > 0)) return 0;
  return Math.ceil(num(d.cards) / Math.max(7, exam.dn - 7 - start));
}

/** Last day a deck adds new cards (inclusive), or Infinity. */
function deckEnd(d: Deck, exam: DatedExam | null, start: number): number {
  if (exam) return exam.dn - 8;
  const per = deckPerDay(d, null, start);
  return num(d.cards) > 0 && per > 0 ? start + Math.ceil(num(d.cards) / per) - 1 : Infinity;
}

export function cardsFor(st: Settings, decks: Deck[], n: number, dated: DatedExam[], start: number): CardsDay {
  const a = st.cards;
  const next = dated.filter((e) => e.dn >= n).sort((x, y) => x.dn - y.dn)[0] || null;
  const daysTo = next ? next.dn - n : Infinity;
  if (!a || !a.on) return { on: false, decks: [], newTotal: 0, reviews: 0, learn: 0, throttled: '', next, daysTo };
  // Decks without an exam slow down before the next exam, so reviews and exam work have room.
  const slow = a.throttle && next ? (daysTo <= 14 ? 'paused' : daysTo <= 28 ? 'halved' : '') : '';
  let throttled: CardsDay['throttled'] = '';
  const out: CardsDay['decks'] = [];
  let load = 0;
  let reviews = 0;
  for (const d of decks) {
    reviews += Math.max(0, num(d.reviews));
    const ex = d.exam ? dated.find((e) => e.id === d.exam) || null : null;
    if (d.exam && !ex) {
      // linked to an exam without a date (yet): no deadline, so only a fixed rate applies
      if (!(num(d.newPerDay) > 0)) continue;
    }
    const base = deckPerDay(d, ex, start);
    if (!(base > 0) || n < start) continue;
    if (ex && n >= ex.dn) continue; // the exam is over
    load += base;
    let per = n <= deckEnd(d, ex, start) ? base : 0;
    if (!ex && per > 0 && slow) {
      per = slow === 'paused' ? 0 : Math.round(per / 2);
      throttled = slow;
    }
    if (per > 0 || ex) out.push({ deck: d, exam: ex, per });
  }
  const newTotal = out.reduce((s, x) => s + x.per, 0);
  reviews = Math.round(reviews + 1.2 * load);
  let learn = Math.round(0.7 * newTotal);
  if (num(a.override) > 0) {
    const tot = num(a.override);
    learn = Math.min(learn, Math.round(tot * 0.35));
    reviews = tot - learn;
  }
  reviews = Math.max(10, Math.min(150, reviews));
  return { on: true, decks: out, newTotal, reviews, learn, throttled, next, daysTo };
}
