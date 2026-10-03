// Which reminders the iOS app schedules for the coming days. Pure: the app turns these into notification texts
// (src/ui/parts/reminders.ts) and hands them to iOS (src/native.ts). Rebuilt whenever the plan changes.
import { num, toMin } from './dates';
import { dayView, type Mod, type Plan } from './planner';
import type { AppData, DatedExam } from './types';

export type Reminder =
  | { kind: 'morning'; n: number; at: number; mods: Mod[] }
  | { kind: 'before'; n: number; at: number; mod: Mod }
  | { kind: 'evening'; n: number; at: number; open: number }
  | { kind: 'exam'; n: number; at: number; exam: DatedExam; days: number };

/** iOS keeps at most 64 pending notifications per app; stay below that. */
export const MAX_REMINDERS = 60;
/** How many days ahead to schedule; opening the app (or any change) schedules the next days again. */
const REMINDER_DAYS = 7;

/** Reminders from day T (at minute nowM) for the next days, soonest first. `at` is minutes after midnight of day n. */
export function plannedReminders(data: AppData, plan: Plan, T: number, nowM: number, days = REMINDER_DAYS): Reminder[] {
  const r = data.settings.reminders;
  if (!r || !(r.morning || r.before || r.evening || r.exam)) return [];
  const morningAt = toMin(r.morningAt), eveningAt = toMin(r.eveningAt);
  const before = Math.max(0, num(r.beforeMin, 10));
  const examDays = Math.max(1, Math.round(num(r.examDays, 3)));
  const out: Reminder[] = [];
  const add = (x: Reminder) => {
    if (Number.isFinite(x.at) && x.at >= 0 && x.at < 24 * 60 && (x.n > T || x.at > nowM)) out.push(x);
  };
  for (let n = T; n < T + days; n++) {
    const v = dayView(data, plan, n);
    const work = v.mods.filter((m) => m.type !== 'x');
    const open = work.filter((m) => !m.done);
    if (r.morning && work.length) add({ kind: 'morning', n, at: morningAt, mods: work });
    if (r.before) for (const m of open) if (m.s != null) add({ kind: 'before', n, at: m.s - before, mod: m });
    if (r.evening && open.length) add({ kind: 'evening', n, at: eveningAt, open: open.length });
    if (r.exam) for (const e of plan.upcoming) if (e.dn - examDays === n) add({ kind: 'exam', n, at: morningAt, exam: e, days: examDays });
  }
  return out.sort((a, b) => a.n - b.n || a.at - b.at).slice(0, MAX_REMINDERS);
}
