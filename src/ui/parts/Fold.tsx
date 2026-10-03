// A Setup section that shows only its heading and a one-line hint until it is opened. Which sections are open is
// remembered while the app runs (switching tabs keeps them), not stored.
import { useEffect, useReducer, type ReactNode } from 'react';
import type { PaletteKey } from '../../core/types';
import { av } from './common';

const open = new Set<string>();
const subs = new Set<() => void>();

export function setFold(id: string, on: boolean): void {
  if (on) open.add(id);
  else open.delete(id);
  subs.forEach((f) => f());
}

export function Fold({ id, color, title, hint, children }: { id: string; color?: PaletteKey | 'grey'; title: string; hint: string; children: ReactNode }) {
  const [, redraw] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    subs.add(redraw);
    return () => {
      subs.delete(redraw);
    };
  }, []);
  const on = open.has(id);
  return (
    <section className={`card fold${on ? ' open' : ''}`} id={id} style={av(color)}>
      <h2 className="fold-h">
        <button type="button" id={`${id}-toggle`} aria-expanded={on} aria-controls={`${id}-body`} onClick={() => setFold(id, !on)}>
          <span className="fold-t">
            <span className="fold-title">{title}</span>
            <span className="fold-hint">{hint}</span>
          </span>
          <span className="fold-chev" aria-hidden="true" />
        </button>
      </h2>
      <div className="fold-body" id={`${id}-body`} hidden={!on}>
        {children}
      </div>
    </section>
  );
}
