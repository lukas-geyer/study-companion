// Everything the UI can change. Each action edits a copy of the data and triggers a save.
import { dn, hm, isISO, isoOf, monOf, todayDn, toMin, weekKey } from '../core/dates';
import { defaultSettings, makeDeck, makeExam, newAppData, SIZES } from '../core/defaults';
import { exampleData } from '../core/example';
import { applyICS, type IcsPreview } from '../core/ics';
import type { Mod } from '../core/planner';
import type { AppData, Deck, Exam, Lang, Region, Size, TtItem } from '../core/types';
import { getState, setUI, updateData, wipeStorage } from './store';

export function toggleDone(m: Mod, n: number): void {
  const iso = m.d;
  updateData((d) => {
    const wk = weekKey(n);
    const doc = (d.done[wk] = d.done[wk] || { items: {} });
    if (doc.items[m.id]) delete doc.items[m.id];
    else doc.items[m.id] = { d: iso, t: m.type, x: m.exam || '', c: m.code || '', min: m.min, s: m.s, e: m.e, at: Date.now() };
  });
}

export function addExam(init: Partial<Exam> = {}): string {
  let id = '';
  updateData((d) => {
    const e = makeExam(d.exams, init);
    id = e.id;
    d.exams.push(e);
  });
  return id;
}

export function updateExam(id: string, patch: Partial<Exam>): void {
  updateData((d) => {
    const e = d.exams.find((x) => x.id === id);
    if (!e) return;
    if (patch.size && patch.size !== e.size) {
      const s: Size = patch.size;
      Object.assign(e, { size: s, hours: SIZES[s].hours, weeks: SIZES[s].weeks });
      delete patch.size;
    }
    Object.assign(e, patch);
  });
}

export function deleteExam(id: string): void {
  updateData((d) => {
    d.exams = d.exams.filter((e) => e.id !== id);
    for (const c of Object.values(d.settings.courses)) if (c.exam === id) c.exam = '';
    for (const k of d.decks) if (k.exam === id) k.exam = '';
  });
}

export function addDeck(init: Partial<Deck> = {}): string {
  let id = '';
  updateData((d) => {
    const k = makeDeck(init);
    id = k.id;
    d.decks.push(k);
  });
  return id;
}
export function updateDeck(id: string, patch: Partial<Deck>): void {
  updateData((d) => {
    const k = d.decks.find((x) => x.id === id);
    if (k) Object.assign(k, patch);
  });
}
export function deleteDeck(id: string): void {
  updateData((d) => {
    d.decks = d.decks.filter((k) => k.id !== id);
  });
}

/** Set a value by dotted path, e.g. "caps.free" or "meals.0.from". */
export function setSetting(path: string, value: unknown): void {
  updateData((d) => {
    const ks = path.split('.');
    let a: Record<string, unknown> = d.settings as unknown as Record<string, unknown>;
    for (let i = 0; i < ks.length - 1; i++) {
      if (a[ks[i]] == null) a[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {};
      a = a[ks[i]] as Record<string, unknown>;
    }
    a[ks[ks.length - 1]] = value;
  });
}

export function setCourse(code: string, patch: { name?: string; exam?: string; busy?: boolean }): void {
  updateData((d) => {
    d.settings.courses[code] = { ...(d.settings.courses[code] || {}), ...patch };
  });
}

export function addTplSlot(dow: number): void {
  updateData((d) => {
    const k = String(dow);
    const arr = d.settings.template[k] || (d.settings.template[k] = []);
    const last = arr[arr.length - 1];
    const from = last ? last.to : '09:00';
    const f = toMin(from);
    const to = Number.isFinite(f) ? hm(Math.min(f + 90, 23 * 60 + 59)) : '10:30';
    arr.push({ from, to, title: '' });
  });
}
export function updateTplSlot(dow: number, i: number, patch: Partial<{ from: string; to: string; title: string }>): void {
  updateData((d) => {
    const s = (d.settings.template[String(dow)] || [])[i];
    if (s) Object.assign(s, patch);
  });
}
export function removeTplSlot(dow: number, i: number): void {
  updateData((d) => {
    (d.settings.template[String(dow)] || []).splice(i, 1);
  });
}

export function addBreak(label: string): void {
  updateData((d) => {
    d.settings.breaks.push({ label, from: '', to: '' });
  });
}
export function updateBreak(i: number, patch: Partial<{ label: string; from: string; to: string }>): void {
  updateData((d) => {
    const b = d.settings.breaks[i];
    if (b) Object.assign(b, patch);
  });
}
export function removeBreak(i: number): void {
  updateData((d) => {
    d.settings.breaks.splice(i, 1);
  });
}

export function addAppt(date: string, s: string, e: string, title: string): void {
  updateData((d) => {
    const wk = weekKey(dn(date));
    const doc = (d.weeks[wk] = d.weeks[wk] || { items: [] });
    doc.items.push({ d: date, s, e, t: title.slice(0, 24), n: title, m: true });
  });
}
export function deleteAppt(raw: TtItem, n: number): void {
  updateData((d) => {
    const doc = d.weeks[weekKey(n)];
    if (!doc) return;
    const i = doc.items.findIndex((x) => x.m && x.d === raw.d && x.s === raw.s && x.e === raw.e && x.t === raw.t);
    if (i >= 0) doc.items.splice(i, 1);
  });
}

export function logExtra(exam: string, min: number, date: string, note: string): void {
  updateData((d) => {
    const wk = weekKey(dn(date));
    const doc = (d.done[wk] = d.done[wk] || { items: {} });
    doc.items[`${date}_x_${exam || 'x'}_${Date.now().toString(36)}`] = { d: date, t: 'x', x: exam, min, note, at: Date.now() };
  });
}

export function importICS(p: IcsPreview): void {
  updateData((d) => applyICS(d, p));
}

export function restoreData(data: AppData): void {
  updateData(() => data);
  const T = todayDn();
  setUI({ wizard: false, view: 'today', dayN: T, weekMon: monOf(T), pane: null });
}

export function resetSettings(): void {
  updateData((d) => {
    const keep = d.settings;
    const s = defaultSettings(keep.region);
    Object.assign(s, {
      lang: keep.lang,
      theme: keep.theme,
      termName: keep.termName,
      startDate: keep.startDate,
      knownUntil: keep.knownUntil,
      courses: keep.courses,
      breaks: keep.breaks,
      template: keep.template,
      reminders: keep.reminders,
      cards: { ...s.cards, on: keep.cards.on },
    });
    d.settings = s;
  });
}

/** Opens Setup at a section (a Fold id such as 'sec-exams'), which unfolds and scrolls into view. */
export function gotoSetup(anchor: string): void {
  setUI({ view: 'setup', anchor });
}

export function loadExample(lang: Lang, region: Region): void {
  const T = todayDn();
  updateData(() => exampleData(lang, region, T));
  setUI({ wizard: false, view: 'today', dayN: T, weekMon: monOf(T) });
}

/** Start with an empty plan (keeps language, region and look) and open the setup assistant. */
export function startFresh(): void {
  const s = getState().data.settings;
  updateData(() => {
    const d = newAppData(s.region);
    Object.assign(d.settings, { lang: s.lang, theme: s.theme });
    return d;
  });
  setUI({ wizard: true, view: 'today', pane: null });
}

export async function wipeAll(): Promise<void> {
  await wipeStorage();
  startFresh();
}

export function finishOnboarding(): void {
  updateData((d) => {
    d.meta.onboarded = true;
    if (!isISO(d.settings.startDate)) d.settings.startDate = isoOf(todayDn());
  });
  const T = todayDn();
  setUI({ wizard: false, view: 'today', dayN: T, weekMon: monOf(T) });
}

