// Flashcards (e.g. Anki): daily reviews and new cards, spread so each exam deck is done a week early.
import { num } from './dates';
import type { DatedExam, Settings } from './types';

export interface CardsDay {
  on: boolean;
  gen: number;
  decks: { exam: DatedExam; per: number }[];
  newTotal: number;
  reviews: number;
  learn: number;
  throttled: '' | 'paused' | 'halved';
  next: DatedExam | null;
  daysTo: number;
}

/** New cards per day for an exam deck: finish `cards` one week before the exam. */
export function deckPerDay(e: DatedExam, start: number): number {
  if (num(e.newPerDay) > 0) return Math.round(num(e.newPerDay));
  const days = Math.max(7, e.dn - 7 - start);
  return Math.ceil(num(e.cards) / days);
}

export function cardsFor(st: Settings, n: number, dated: DatedExam[], start: number): CardsDay {
  const a = st.cards;
  const next = dated.filter((e) => e.dn >= n).sort((x, y) => x.dn - y.dn)[0] || null;
  const daysTo = next ? next.dn - n : Infinity;
  if (!a || !a.on) return { on: false, gen: 0, decks: [], newTotal: 0, reviews: 0, learn: 0, throttled: '', next, daysTo };
  let gen = Math.max(0, Math.round(num(a.generalNew)));
  let throttled: CardsDay['throttled'] = '';
  if (a.throttle && next && gen > 0) {
    if (daysTo <= 14) {
      gen = 0;
      throttled = 'paused';
    } else if (daysTo <= 28) {
      gen = Math.round(gen / 2);
      throttled = 'halved';
    }
  }
  const decks: CardsDay['decks'] = [];
  for (const e of dated) {
    if (!(num(e.cards) > 0) || n < start || n >= e.dn) continue;
    decks.push({ exam: e, per: n < e.dn - 7 ? deckPerDay(e, start) : 0 });
  }
  const newTotal = gen + decks.reduce((s, x) => s + x.per, 0);
  const load = Math.max(0, num(a.generalNew)) + decks.reduce((s, x) => s + deckPerDay(x.exam, start), 0);
  let reviews = Math.round(num(a.reviewBase, 20) + 1.2 * load);
  let learn = Math.round(0.7 * newTotal);
  if (num(a.override) > 0) {
    const tot = num(a.override);
    learn = Math.min(learn, Math.round(tot * 0.35));
    reviews = tot - learn;
  }
  reviews = Math.max(10, Math.min(150, reviews));
  return { on: true, gen, decks, newTotal, reviews, learn, throttled, next, daysTo };
}
