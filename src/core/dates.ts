// Calendar maths on "day numbers" (days since 1970-01-01, UTC based, so no DST surprises).
export const DAYMS = 864e5;

export const pad = (x: number): string => String(x).padStart(2, '0');
export const num = (v: unknown, d = 0): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
};
export const isISO = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

export function dn(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAYMS);
}
export const isoOf = (n: number): string => new Date(n * DAYMS).toISOString().slice(0, 10);
export const dateOf = (n: number): Date => new Date(n * DAYMS);
export const dowOf = (n: number): number => dateOf(n).getUTCDay();
export const yearOf = (n: number): number => dateOf(n).getUTCFullYear();
export const monthOf = (n: number): number => dateOf(n).getUTCMonth();
export const dayOfMonth = (n: number): number => dateOf(n).getUTCDate();
export const dnOf = (y: number, m0: number, d: number): number => Math.round(Date.UTC(y, m0, d) / DAYMS);

export function todayDn(now: Date = new Date()): number {
  return Math.round(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAYMS);
}
export function nowMin(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}
/** Monday of the ISO week containing n. */
export const monOf = (n: number): number => n - ((dowOf(n) + 6) % 7);

/** ISO week key like "2026-W41". */
export function weekKey(n: number): string {
  const mon = monOf(n);
  const y = yearOf(mon + 3);
  const j4 = dnOf(y, 0, 4);
  return `${y}-W${pad(1 + Math.round((mon - monOf(j4)) / 7))}`;
}
export const kwOf = (n: number): number => Number(weekKey(n).slice(-2));

/** "HH:MM" → minutes after midnight (NaN when malformed). */
export function toMin(s: unknown): number {
  if (typeof s !== 'string' || !/^\d{1,2}:\d{2}$/.test(s)) return NaN;
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}
/** minutes → "HH:MM" */
export function hm(x: number): string {
  const r = Math.round(x);
  return `${pad(Math.floor(r / 60))}:${pad(r % 60)}`;
}
