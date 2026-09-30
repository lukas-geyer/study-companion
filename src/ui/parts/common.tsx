import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { ExamStat } from '../../core/planner';
import type { Exam, PaletteKey } from '../../core/types';
import type { T } from '../../i18n';

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export type Vars = CSSProperties & Record<`--${string}`, string>;
/** CSS variables for an exam colour (--x, --x-bg, --x-mid); grey when there is no exam. */
export function xv(e?: Exam | null): Vars {
  const c = e?.color;
  return c
    ? { '--x': `var(--${c})`, '--x-bg': `var(--${c}-bg)`, '--x-mid': `var(--${c}-mid)` }
    : { '--x': 'var(--grey)', '--x-bg': 'var(--grey-bg)', '--x-mid': 'var(--grey-mid)' };
}
/** Accent variables (--acc, --acc-bg, --acc-mid) for a palette colour. */
export function av(c?: PaletteKey | 'grey' | null): Vars {
  return c ? { '--acc': `var(--${c})`, '--acc-bg': `var(--${c}-bg)`, '--acc-mid': `var(--${c}-mid)` } : {};
}
export const both = (e?: Exam | null): Vars => ({ ...xv(e), ...av(e?.color) });

export const exLabel = (e: Exam | null | undefined, t: T): string => (e ? e.short || e.name || t('exam.fallback') : '');
export const exName = (e: Exam | null | undefined, t: T): string => (e ? e.name || e.short || t('exam.fallback') : '');

export function Box({ kind, label, children }: { kind: 'hinweis' | 'lerntipp' | 'achtung' | 'praxis' | 'info'; label: string; children: ReactNode }) {
  return (
    <div className={`box box-${kind}`}>
      <div className="box-label">{label}</div>
      <div className="box-body">{children}</div>
    </div>
  );
}

export function Dot({ lg, style }: { lg?: boolean; style?: CSSProperties }) {
  return <span className={lg ? 'dot lg' : 'dot'} style={style} aria-hidden="true" />;
}

export function StatusPill({ st, t }: { st?: ExamStat | null; t: T }) {
  if (!st) return null;
  switch (st.status) {
    case 'ok':
      return <span className="spill ok">{t('status.ok')}</span>;
    case 'tight':
      return <span className="spill tight">{t('status.tight')}</span>;
    case 'short':
      return <span className="spill short">{t('status.short', Math.max(1, Math.ceil((st.need - st.projected) / 60)))}</span>;
    case 'past':
      return <span className="spill grey">{t('status.past')}</span>;
    default:
      return <span className="spill grey">{t('status.nodate')}</span>;
  }
}

export function statusText(st: ExamStat | null | undefined, t: T): string {
  if (!st) return '';
  if (st.status === 'short') return t('statusText.short', Math.ceil((st.need - st.projected) / 60));
  if (st.status === 'tight') return t('statusText.tight');
  if (st.status === 'ok') return t('statusText.ok');
  return '';
}

export function Html({ html, as = 'span', className }: { html: string; as?: 'span' | 'p' | 'div'; className?: string }) {
  const Tag = as;
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

// ---------------------------------------------------------------- form fields
export function Fld({ id, label, className, children }: { id: string; label: string; className?: string; children: ReactNode }) {
  return (
    <div className={`fld ${className || ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

/** Text/number input that keeps typing local and commits on blur or Enter. */
export function CommitInput({
  id,
  type = 'text',
  value,
  onCommit,
  placeholder,
  min,
  max,
  step,
  maxLength,
  ariaLabel,
  autoFocus,
}: {
  id: string;
  type?: 'text' | 'number';
  value: string | number;
  onCommit: (v: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
  ariaLabel?: string;
  autoFocus?: boolean;
}) {
  const [v, setV] = useState(String(value ?? ''));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setV(String(value ?? ''));
  }, [value]);
  const commit = () => {
    if (v !== String(value ?? '')) onCommit(v);
  };
  return (
    <input
      id={id}
      type={type}
      value={v}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      maxLength={maxLength}
      aria-label={ariaLabel}
      autoFocus={autoFocus}
      inputMode={type === 'number' ? 'decimal' : undefined}
      onFocus={() => (focused.current = true)}
      onChange={(ev) => setV(ev.target.value)}
      onBlur={() => {
        focused.current = false;
        commit();
      }}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur();
      }}
    />
  );
}

/** Date or time input that commits whenever the browser reports a complete value. */
export function PickInput({ id, type, value, onCommit, ariaLabel }: { id: string; type: 'date' | 'time'; value: string; onCommit: (v: string) => void; ariaLabel?: string }) {
  return <input id={id} type={type} value={value || ''} aria-label={ariaLabel} onChange={(ev) => onCommit(ev.target.value)} />;
}

export function Toggle({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="swt" htmlFor={id}>
      <input type="checkbox" id={id} checked={checked} onChange={(ev) => onChange(ev.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

export const numOr = (v: string, d = 0): number => {
  const x = Number(String(v).replace(',', '.'));
  return Number.isFinite(x) ? x : d;
};
