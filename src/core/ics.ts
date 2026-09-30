// Calendar import (.ics): events → timetable entries; weekly/daily recurrences expanded.
import { dn, dowOf, hm, isISO, isoOf, monOf, todayDn, toMin, weekKey } from './dates';
import type { AppData, TtItem } from './types';

interface IcsProp { v: string; p: Record<string, string> }
interface RawEvent {
  ex: string[];
  ds?: IcsProp;
  de?: IcsProp;
  du?: string;
  sum?: string;
  loc?: string;
  desc?: string;
  rr?: string;
  status?: string;
}

const icsText = (v: string) => v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();

export function parseICS(text: string): RawEvent[] {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const evs: RawEvent[] = [];
  let cur: RawEvent | null = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) continue;
    if (/^BEGIN:VEVENT$/i.test(line)) {
      cur = { ex: [] };
      continue;
    }
    if (/^END:VEVENT$/i.test(line)) {
      if (cur) evs.push(cur);
      cur = null;
      continue;
    }
    if (!cur) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const parts = line.slice(0, i).split(';');
    const val = line.slice(i + 1);
    const name = parts[0].toUpperCase();
    const p: Record<string, string> = {};
    for (const kv of parts.slice(1)) {
      const j = kv.indexOf('=');
      if (j > 0) p[kv.slice(0, j).toUpperCase()] = kv.slice(j + 1).replace(/^"|"$/g, '');
    }
    if (name === 'DTSTART') cur.ds = { v: val.trim(), p };
    else if (name === 'DTEND') cur.de = { v: val.trim(), p };
    else if (name === 'DURATION') cur.du = val.trim();
    else if (name === 'SUMMARY') cur.sum = icsText(val);
    else if (name === 'LOCATION') cur.loc = icsText(val);
    else if (name === 'DESCRIPTION') cur.desc = icsText(val);
    else if (name === 'RRULE') cur.rr = val.trim();
    else if (name === 'EXDATE') cur.ex.push(...val.split(',').map((s) => s.trim()));
    else if (name === 'STATUS') cur.status = val.trim().toUpperCase();
  }
  return evs;
}

interface IcsTime { n: number; min: number; allDay?: boolean }

function icsDate(o: IcsProp | undefined): IcsTime | null {
  if (!o) return null;
  const v = o.v;
  if ((o.p && o.p.VALUE === 'DATE') || /^\d{8}$/.test(v)) return { n: dn(`${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`), min: 0, allDay: true };
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z?)$/);
  if (!m) return null;
  if (m[7] === 'Z') {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
    return { n: todayDn(d), min: d.getHours() * 60 + d.getMinutes() };
  }
  // TZID or floating times are taken as local wall-clock time.
  return { n: dn(`${m[1]}-${m[2]}-${m[3]}`), min: +m[4] * 60 + +m[5] };
}

function icsDur(s: string | undefined): number | null {
  const m = (s || '').match(/^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  return m ? (+m[1] || 0) * 10080 + (+m[2] || 0) * 1440 + (+m[3] || 0) * 60 + (+m[4] || 0) : null;
}

/** Course code: a leading all-caps code (e.g. "TMCB VO …" → "TMCB"), else the start of the title. */
export function courseCode(sum: string | undefined): string {
  const s = (sum || '').trim();
  const m = s.match(/^([A-ZÄÖÜ][A-ZÄÖÜ0-9]{2,7})(?![a-zäöüß])/);
  return m ? m[1] : s.slice(0, 24) || 'Class';
}

export function expandICS(evs: RawEvent[]): TtItem[] {
  const out: TtItem[] = [];
  const map: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  for (const ev of evs) {
    if (ev.status === 'CANCELLED') continue;
    const a = icsDate(ev.ds);
    if (!a || a.allDay) continue;
    const b = icsDate(ev.de);
    const len = b && !b.allDay ? (b.n - a.n) * 1440 + (b.min - a.min) : ev.du ? icsDur(ev.du) ?? 60 : 60;
    if (!(len > 0) || len > 16 * 60 || a.min + len > 1440) continue;
    let occ = [a.n];
    if (ev.rr) {
      const r = Object.fromEntries(ev.rr.split(';').map((kv) => kv.split('='))) as Record<string, string>;
      const iv = Math.max(1, +r.INTERVAL || 1);
      const count = r.COUNT ? +r.COUNT : Infinity;
      const u = r.UNTIL ? icsDate({ v: r.UNTIL, p: {} }) : null;
      const until = u ? u.n : a.n + 400;
      if (r.FREQ === 'DAILY') {
        occ = [];
        for (let n = a.n, k = 0; n <= until && k < count; n += iv, k++) occ.push(n);
      } else if (r.FREQ === 'WEEKLY') {
        occ = [];
        const ds = (r.BYDAY ? r.BYDAY.split(',').map((x) => map[x.slice(-2)]).filter((x) => x != null) : [dowOf(a.n)])
          .map((x) => (x + 6) % 7)
          .sort((x, y) => x - y);
        let k = 0;
        for (let w = monOf(a.n); w <= until && k < count; w += 7 * iv) {
          for (const o of ds) {
            const n = w + o;
            if (n < a.n || n > until || k >= count) continue;
            occ.push(n);
            k++;
          }
        }
      }
    }
    const skip = new Set(
      ev.ex.map((x) => {
        const d = icsDate({ v: x, p: {} });
        return d ? `${d.n}:${d.allDay ? '*' : d.min}` : '';
      }),
    );
    const online = /online|webex|zoom|teams|virtuell|stream/i.test(`${ev.loc || ''} ${ev.desc || ''}`);
    for (const n of occ) {
      if (skip.has(`${n}:${a.min}`) || skip.has(`${n}:*`)) continue;
      const x: TtItem = { d: isoOf(n), s: hm(a.min), e: hm(a.min + len), t: courseCode(ev.sum), n: (ev.sum || '').slice(0, 80) };
      if (online) x.on = true;
      if (ev.status === 'TENTATIVE') x.tent = true;
      out.push(x);
    }
  }
  return out.sort((x, y) => (x.d < y.d ? -1 : x.d > y.d ? 1 : toMin(x.s) - toMin(y.s)));
}

export interface IcsPreview { events: TtItem[]; first: number; last: number; weeks: number; codes: string[] }

export function previewICS(text: string): IcsPreview | null {
  const events = expandICS(parseICS(text));
  if (!events.length) return null;
  const weeks = new Set(events.map((x) => weekKey(dn(x.d))));
  return { events, first: dn(events[0].d), last: dn(events[events.length - 1].d), weeks: weeks.size, codes: [...new Set(events.map((x) => x.t))] };
}

/** Replace the classes of every week the import covers; the user's own appointments stay. */
export function applyICS(data: AppData, p: IcsPreview): AppData {
  const weeks = { ...data.weeks };
  const by: Record<string, TtItem[]> = {};
  for (const x of p.events) (by[weekKey(dn(x.d))] = by[weekKey(dn(x.d))] || []).push(x);
  for (let w = monOf(p.first); w <= p.last; w += 7) {
    const k = weekKey(w);
    const keep = ((weeks[k] || { items: [] }).items || []).filter((x) => x.m);
    weeks[k] = { items: keep.concat(by[k] || []), src: 'ics' };
  }
  const lastIso = isoOf(p.last);
  const settings = { ...data.settings };
  if (!isISO(settings.knownUntil) || lastIso > settings.knownUntil) settings.knownUntil = lastIso;
  return { ...data, weeks, settings };
}
