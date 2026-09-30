// Minute intervals within a day: [start, end) pairs.
export type Iv = [number, number];

export function mergeIv(ivs: Iv[]): Iv[] {
  const a = ivs.filter((x) => x[1] > x[0]).map((x) => [x[0], x[1]] as Iv).sort((x, y) => x[0] - y[0]);
  const out: Iv[] = [];
  for (const [s, e] of a) {
    const l = out[out.length - 1];
    if (l && s <= l[1]) l[1] = Math.max(l[1], e);
    else out.push([s, e]);
  }
  return out;
}

/** The parts of window [ws, we) not covered by the (sorted, merged) blocks. */
export function subtractIv([ws, we]: Iv, blocks: Iv[]): Iv[] {
  const out: Iv[] = [];
  let cur = ws;
  for (const [s, e] of blocks) {
    if (e <= cur) continue;
    if (s >= we) break;
    if (s > cur) out.push([cur, Math.min(s, we)]);
    cur = Math.max(cur, e);
    if (cur >= we) break;
  }
  if (cur < we) out.push([cur, we]);
  return out;
}

function cut(free: Iv[], i: number, a: number, b: number): void {
  const [s, e] = free[i];
  const parts: Iv[] = [];
  if (a - s >= 10) parts.push([s, a]);
  if (e - b >= 10) parts.push([b, e]);
  free.splice(i, 1, ...parts);
}

/** Take the earliest slot of `len` minutes (optionally not before `after`, keeping `gap` free after it). */
export function placeFirst(free: Iv[], len: number, o: { after?: number; gap?: number } = {}): Iv | null {
  const after = Number.isFinite(o.after) ? (o.after as number) : -Infinity;
  for (let i = 0; i < free.length; i++) {
    const [s, e] = free[i];
    const s2 = Math.max(s, after);
    if (e - s2 >= len) {
      cut(free, i, s2, Math.min(e, s2 + len + (o.gap || 0)));
      return [s2, s2 + len];
    }
  }
  return null;
}

/** Take the latest slot of `len` minutes that starts at or after `minStart`. */
export function placeLast(free: Iv[], len: number, o: { minStart?: number } = {}): Iv | null {
  const minStart = Number.isFinite(o.minStart) ? (o.minStart as number) : -Infinity;
  for (let i = free.length - 1; i >= 0; i--) {
    const [s, e] = free[i];
    if (e - s >= len && e - len >= minStart) {
      cut(free, i, e - len, e);
      return [e - len, e];
    }
  }
  return null;
}
