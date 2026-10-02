// Notification texts for the reminders the plan produces (src/core/reminders.ts), in the app's language.
import type { Plan } from '../../core/planner';
import type { Reminder } from '../../core/reminders';
import type { AppData } from '../../core/types';
import { dateOf, hm } from '../../core/dates';
import type { I18n } from '../../i18n';
import type { Note } from '../../native';
import { exLabel, statusText } from './common';
import { modTitle } from './labels';

/** Day number + minutes → a local Date (day numbers are calendar days, independent of time zone). */
const localDate = (n: number, at: number) => {
  const d = dateOf(n);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, at);
};

export function reminderNotes(rs: Reminder[], data: AppData, plan: Plan, { t, f }: I18n): Note[] {
  return rs.map((r): Note => {
    const at = localDate(r.n, r.at);
    switch (r.kind) {
      case 'morning': {
        const first = r.mods.find((m) => m.s != null);
        const body = first ? t('rem.morningBody', r.mods.length, modTitle(first, data, t), hm(first.s as number)) : t('rem.morningBodyAny', r.mods.length);
        return { at, title: t('rem.morningTitle', f.dur(r.mods.reduce((a, m) => a + m.min, 0))), body };
      }
      case 'before': {
        const m = r.mod;
        return { at, title: t('rem.beforeTitle', modTitle(m, data, t), (m.s as number) - r.at), body: `${hm(m.s as number)}–${hm(m.e as number)} · ${f.dur(m.min)}` };
      }
      case 'evening':
        return { at, title: t('rem.eveningTitle', r.open), body: t('rem.eveningBody') };
      case 'exam':
        return { at, title: t('rem.examTitle', exLabel(r.exam, t), r.days), body: t('rem.examBody', f.day(r.exam.dn), statusText(plan.stats[r.exam.id], t)) };
    }
  });
}
