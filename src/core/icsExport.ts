// Calendar export (.ics) of the planned blocks, so they show up in Apple/Google/Outlook calendars.
import { APP_ID } from '../config';
import { hm, isoOf, pad } from './dates';
import type { Mod, Plan } from './planner';

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Fold long lines (RFC 5545 asks for ≤ 75 octets; 60 characters keeps multi-byte text safe). */
function fold(line: string): string {
  if (line.length <= 60) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 60) parts.push((i ? ' ' : '') + line.slice(i, i + 60));
  return parts.join('\r\n');
}

const stamp = (iso: string, min: number) => `${iso.replace(/-/g, '')}T${hm(min).replace(':', '')}00`;

export interface ExportOptions {
  from: number;
  to: number;
  includeCards: boolean;
  title: (m: Mod) => string;
  description: (m: Mod) => string;
  calendarName: string;
}

export function planToICS(plan: Plan, o: ExportOptions): string {
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
  const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${APP_ID}//planner//EN`, 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${esc(o.calendarName)}`];
  for (let n = Math.max(o.from, plan.T); n <= Math.min(o.to, plan.last); n++) {
    const d = plan.days.get(n);
    if (!d) continue;
    const iso = isoOf(n);
    for (const m of d.mods) {
      if (m.s == null || m.e == null) continue;
      if (!o.includeCards && (m.type === 'rev' || m.type === 'new')) continue;
      out.push(
        'BEGIN:VEVENT',
        `UID:${m.id}@${APP_ID}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${stamp(iso, m.s)}`,
        `DTEND:${stamp(iso, m.e)}`,
        fold(`SUMMARY:${esc(o.title(m))}`),
        fold(`DESCRIPTION:${esc(o.description(m))}`),
        'TRANSP:OPAQUE',
        'END:VEVENT',
      );
    }
  }
  out.push('END:VCALENDAR');
  return out.join('\r\n') + '\r\n';
}
