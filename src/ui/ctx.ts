import { createContext, useContext } from 'react';
import type { Plan } from '../core/planner';
import type { AppData } from '../core/types';
import type { I18n } from '../i18n';
import type { UIState } from '../state/store';

export interface Ctx {
  data: AppData;
  ui: UIState;
  plan: Plan;
  T: number;
  now: Date;
  i18n: I18n;
}

export const CtxR = createContext<Ctx | null>(null);

export function useCtx(): Ctx {
  const c = useContext(CtxR);
  if (!c) throw new Error('no context');
  return c;
}
