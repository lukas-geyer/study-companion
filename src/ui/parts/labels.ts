// Human-readable titles, labels and tips for planned blocks and classes.
import { dn, isISO } from '../../core/dates';
import { cardsAt, type Mod, type Plan } from '../../core/planner';
import type { DisplayClass } from '../../core/timetable';
import type { AppData, Exam } from '../../core/types';
import type { T } from '../../i18n';
import { exLabel } from './common';

export const examById = (data: AppData, id?: string | null): Exam | null => (id ? data.exams.find((e) => e.id === id) || null : null);

export function modClass(m: Mod, data: AppData): 'anki' | 'ex' | 'neutral' {
  if (m.type === 'rev' || m.type === 'new') return 'anki';
  if (m.type === 'wr') return 'neutral';
  return examById(data, m.exam) ? 'ex' : 'neutral';
}

export function modTitle(m: Mod, data: AppData, t: T): string {
  const e = examById(data, m.exam);
  const s = exLabel(e, t);
  switch (m.type) {
    case 'rev':
      return t('mod.rev') + (m.part ? t('mod.revPart', m.part) : '');
    case 'new':
      return t('mod.new');
    case 'fu':
      return t('mod.fu', m.code || t('mod.fuFallback'));
    case 'wr':
      return t('mod.wr');
    case 'x':
      return t('mod.x', s || t('mod.study'));
    default:
      return `${s || t('exam.fallback')} · ${t(`type.${m.type}` as 'type.deep')}`;
  }
}

export function blkLabel(m: Mod, data: AppData, t: T): string {
  if (m.type === 'rev' || m.type === 'new') return t('blk.cards');
  if (m.type === 'wr') return t('blk.wr');
  const e = examById(data, m.exam);
  if (m.type === 'fu' && !e) return `↺ ${m.code || t('class.fallback')}`;
  return exLabel(e, t) || t('mod.study');
}

export function phase(e: Exam | null, n: number, t: T): [string, string] | null {
  if (!e || !isISO(e.date)) return null;
  const d = dn(e.date) - n;
  if (d > 21) return [t('phase.learn'), t('phase.learnTip')];
  if (d > 7) return [t('phase.consolidate'), t('phase.consolidateTip')];
  return [t('phase.sharpen'), t('phase.sharpenTip')];
}

/** Tip for a block: [bold lead-in, text]. */
export function modTip(m: Mod, n: number, data: AppData, plan: Plan, t: T): [string, string] {
  const e = examById(data, m.exam);
  switch (m.type) {
    case 'rev':
      return ['', t('tip.rev')];
    case 'new': {
      const a = cardsAt(data, plan, n);
      const parts: string[] = [];
      if (a.gen > 0) parts.push(t('tip.newPart', a.gen, data.settings.cards.generalName || t('cards.general')));
      for (const x of a.decks) if (x.per > 0) parts.push(t('tip.newPart', x.per, t('tip.deck', exLabel(x.exam, t))));
      return ['', t('tip.new', parts.join(', '))];
    }
    case 'fu':
      return ['', t('tip.fu', m.code || t('mod.fuFallback'))];
    case 'wr':
      return ['', t('tip.wr')];
    case 'final':
      return ['', t('tip.final')];
    case 'x':
      return ['', m.note || t('tip.x')];
    default: {
      const p = phase(e, n, t);
      return p ? [p[0], p[1]] : ['', t('tip.study')];
    }
  }
}

export const clsName = (b: DisplayClass, data: AppData): string => (b.m ? '' : (data.settings.courses[b.t] || {}).name || b.name);
