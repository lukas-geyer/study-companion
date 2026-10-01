import { useEffect, useRef, useState } from 'react';
import { dn, dnOf, isISO, kwOf, monOf, monthOf, num, yearOf } from '../../core/dates';
import { weekTotals, type WeekTotals } from '../../core/planner';
import { useCtx } from '../ctx';
import { av, Box, exLabel, Html, StatusPill, xv, esc } from '../parts/common';
import { examById } from '../parts/labels';
import { gotoSetup } from './Today';

export function YearView() {
  const { data, plan, T, i18n } = useCtx();
  const { t, f } = i18n;
  const dated = data.exams.filter((e) => isISO(e.date)).sort((a, b) => dn(a.date) - dn(b.date));
  const undated = data.exams.filter((e) => !isISO(e.date));
  const starts = dated.map((e) => dn(e.date) - Math.max(1, num(e.weeks, 5)) * 7);
  const R0 = monOf(Math.min(T, ...starts.map((s) => Math.max(s, T - 180))));
  const R1 = Math.max(T + 70, ...dated.map((e) => dn(e.date) + 7));
  const span = Math.max(1, R1 - R0);
  const X = (n: number) => ((Math.max(R0, Math.min(R1, n)) - R0) / span) * 100;
  const months: { n: number; label: string }[] = [];
  {
    let y = yearOf(R0), m = monthOf(R0) + 1;
    for (;;) {
      if (m > 11) {
        m = 0;
        y++;
      }
      const n = dnOf(y, m, 1);
      if (n > R1) break;
      months.push({ n, label: f.month(m) + (m === 0 || months.length === 0 ? ` ${String(y).slice(2)}` : '') });
      m++;
    }
  }
  return (
    <div className="stack">
      <section className="card">
        <div className="kicker">{data.settings.termName || t('year.kicker')}</div>
        <h2 className="h2">{t('year.timeline')}</h2>
        <p className="sub">{t('year.timelineSub')}</p>
        {dated.length ? (
          <div className="gantt">
            <div className="g-head">
              <div className="g-months">
                {months.map((mm) => (
                  <span key={mm.n} style={{ left: `${X(mm.n)}%` }}>
                    {mm.label}
                  </span>
                ))}
              </div>
            </div>
            {dated.map((e) => {
              const x = dn(e.date);
              const st = plan.stats[e.id];
              const m = plan.meta[e.id];
              const weeks = Math.max(1, num(e.weeks, 5));
              const nominal = x - weeks * 7;
              const start = m ? Math.min(m.start, nominal) : nominal;
              const b0 = Math.max(nominal, start);
              return (
                <div className={`g-row${x < T ? ' past' : ''}`} key={e.id} style={xv(e)}>
                  <div className="g-lab">
                    <span className="dot lg" style={av(e.color)} />
                    <div>
                      <b>{exLabel(e, t)}</b>
                      {e.name && e.name !== e.short && <small>{e.name}</small>}
                      <small>
                        {f.day(x)} {yearOf(x)}
                      </small>
                    </div>
                  </div>
                  <div className="g-track">
                    {months.map((mm) => (
                      <i key={mm.n} className="g-grid" style={{ left: `${X(mm.n)}%` }} />
                    ))}
                    {m && m.start < nominal && <i className="g-ext" style={{ left: `${X(m.start)}%`, width: `${X(nominal) - X(m.start)}%` }} />}
                    <i className="g-bar" style={{ left: `${X(b0)}%`, width: `${X(x) - X(b0)}%` }} />
                    <i className="g-mark" style={{ left: `${X(x)}%` }} />
                    <i className="g-today" style={{ left: `${X(T)}%` }} />
                  </div>
                  <div className="g-stat">
                    <StatusPill st={st} t={t} />
                    <span title={t('year.hoursTitle')}>{x < T ? t('year.logged', f.hrs(st?.done || 0)) : `${f.hrs(st?.projected || 0)} / ${f.hrs(st?.need || 0)}`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Box kind="hinweis" label={t('year.noDates')}>
            <p>{t('year.noDatesBody')}</p>
            <div className="row-actions">
              <button className="btn sm" onClick={() => gotoSetup('sec-exams')}>
                {t('note.addExamsBtn')}
              </button>
            </div>
          </Box>
        )}
        {undated.length > 0 && dated.length > 0 && (
          <p className="small muted" style={{ margin: '12px 0 0' }}>
            {t('year.undated', undated.map((e) => exLabel(e, t)).join(', '))}
          </p>
        )}
      </section>
      <section className="card">
        <h2 className="h2">{t('year.load')}</h2>
        <p className="sub">{t('year.loadSub')}</p>
        <LoadChart R1={R1} />
      </section>
      {dated.length > 0 && (
        <section className="card">
          <h2 className="h2">{t('year.stands')}</h2>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t('th.exam')}</th>
                  <th>{t('th.date')}</th>
                  <th className="r">{t('th.daysLeft')}</th>
                  <th className="r">{t('th.hoursSet')}</th>
                  <th className="r">{t('th.planned')}</th>
                  <th className="r">{t('th.done')}</th>
                  <th>{t('th.prepStarts')}</th>
                  <th>{t('th.status')}</th>
                </tr>
              </thead>
              <tbody>
                {dated.map((e) => {
                  const x = dn(e.date);
                  const st = plan.stats[e.id];
                  const m = plan.meta[e.id];
                  return (
                    <tr key={e.id}>
                      <td>
                        <span className="lg" style={av(e.color)}>
                          <span className="dot" />
                          <b>{exLabel(e, t)}</b>
                        </span>
                      </td>
                      <td>{f.day(x)}</td>
                      <td className="r">{x >= T ? x - T : '–'}</td>
                      <td className="r">{f.hrs(st?.need || 0)}</td>
                      <td className="r">{f.hrs(st?.planned || 0)}</td>
                      <td className="r">{f.hrs(st?.done || 0)}</td>
                      <td>{m ? f.short(m.start) + (m.extended ? t('year.earlier') : '') : '–'}</td>
                      <td>
                        <StatusPill st={st} t={t} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function LoadChart({ R1 }: { R1: number }) {
  const { data, plan, T, i18n } = useCtx();
  const { t, f } = i18n;
  const [on, setOn] = useState<number | null>(null);
  const [tipX, setTipX] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  // Fill the card's width; with many weeks the chart keeps a minimum spacing and scrolls sideways.
  const [avail, setAvail] = useState(0);
  useEffect(() => {
    const w = wrap.current;
    if (!w || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setAvail(w.clientWidth));
    ro.observe(w);
    return () => ro.disconnect();
  }, []);
  const weeks: (WeekTotals & { w: number })[] = [];
  for (let w = monOf(T); w <= monOf(R1); w += 7) weeks.push({ w, ...weekTotals(data, plan, w) });
  const maxH = Math.max(10, ...weeks.map((x) => (x.study + x.cards) / 60));
  const top = Math.ceil(maxH / 10) * 10;
  const padL = 32, padT = 12, H = 150, padB = 58;
  const slot = Math.max(19, (avail - padL - 8) / weeks.length);
  const bw = Math.round(Math.min(28, Math.max(12, slot * 0.6))), gap = slot - bw;
  const W = Math.floor(padL + weeks.length * slot + 8);
  const yv = (h: number) => padT + H - (h / top) * H;
  const grid = [];
  for (let g = 0; g <= top; g += 10)
    grid.push(
      <g key={g}>
        <line className="gl" x1={padL} x2={W - 4} y1={yv(g)} y2={yv(g)} />
        <text className="ax" x={padL - 8} y={yv(g) + 3.5} textAnchor="end">
          {g} h
        </text>
      </g>,
    );
  const marks: { x: number; id: string }[] = [];
  let lastMon = -1;
  const bars = weeks.map((wk, i) => {
    const x = padL + i * (bw + gap);
    const hh = (wk.study + wk.cards) / 60;
    const bh = Math.max(0, (hh / top) * H);
    const y0 = yv(0);
    const r = Math.min(4, bh);
    const mo = monthOf(wk.w + 3);
    const label = mo !== lastMon ? f.month(mo) : null;
    lastMon = mo;
    for (const e of plan.upcoming) if (monOf(e.dn) === wk.w) marks.push({ x: x + bw / 2, id: e.id });
    return (
      <g key={wk.w}>
        {bh >= 1 && <path className={`bar${on === i ? ' on' : ''}`} d={`M${x},${y0} V${y0 - bh + r} Q${x},${y0 - bh} ${x + r},${y0 - bh} H${x + bw - r} Q${x + bw},${y0 - bh} ${x + bw},${y0 - bh + r} V${y0} Z`} />}
        {label && (
          <text className="mo" x={x} y={y0 + 16}>
            {label}
          </text>
        )}
        <rect
          className="hit"
          x={x - gap / 2}
          y={padT}
          width={bw + gap}
          height={H}
          tabIndex={0}
          aria-label={`${t('kw', kwOf(wk.w))}: ${f.hrs(wk.study + wk.cards)}`}
          onPointerEnter={(ev) => show(i, ev.currentTarget)}
          onFocus={(ev) => show(i, ev.currentTarget)}
          onPointerLeave={() => setOn(null)}
          onBlur={() => setOn(null)}
        />
      </g>
    );
  });
  function show(i: number, el: Element) {
    const w = wrap.current;
    if (!w) return;
    const r = el.getBoundingClientRect(), wr = w.getBoundingClientRect();
    setOn(i);
    requestAnimationFrame(() => {
      const tipW = tipRef.current?.offsetWidth || 180;
      let left = r.left - wr.left + w.scrollLeft + r.width / 2 - tipW / 2;
      left = Math.max(w.scrollLeft + 4, Math.min(left, w.scrollLeft + w.clientWidth - tipW - 4));
      setTipX(left);
    });
  }
  let lastX = -99, lvl = 0;
  const markEls = marks.map((mk) => {
    lvl = mk.x - lastX < 46 ? (lvl + 1) % 2 : 0;
    lastX = mk.x;
    const e = examById(data, mk.id);
    const cy = padT + H + 28 + lvl * 16;
    return (
      <g key={mk.id}>
        <circle cx={mk.x} cy={cy} r={5} style={{ fill: `var(--${e?.color || 'grey'}-mid)`, stroke: `var(--${e?.color || 'grey'})`, strokeWidth: 1.5 }} />
        <text className="xl" x={mk.x + 8} y={cy + 3.5}>
          {exLabel(e, t)}
        </text>
      </g>
    );
  });
  const wk = on != null ? weeks[on] : null;
  const byTxt = (w: WeekTotals) =>
    Object.entries(w.by)
      .sort((a, b) => b[1] - a[1])
      .map(([id, m]) => `${esc(exLabel(examById(data, id), t) || t('year.other'))} ${f.hrs(m)}`)
      .join(' · ');
  return (
    <>
      <div className="chart-wrap" ref={wrap}>
        <svg className="load" width={W} height={padT + H + padB} viewBox={`0 0 ${W} ${padT + H + padB}`} role="img" aria-label={t('year.loadAria')}>
          {grid}
          {bars}
          {markEls}
        </svg>
        {wk && (
          <div className="ctip" ref={tipRef} style={{ left: tipX, top: 4 }}>
            <Html html={t('year.tip', t('kw', kwOf(wk.w)), esc(f.range(wk.w, wk.w + 6)), f.hrs(wk.study + wk.cards), f.hrs(wk.cards)) + (byTxt(wk) ? `<br>${byTxt(wk)}` : '')} />
          </div>
        )}
      </div>
      <details className="more">
        <summary>{t('year.table')}</summary>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t('th.week')}</th>
                <th className="r">{t('th.total')}</th>
                {data.settings.cards.on && <th className="r">{t('th.cards')}</th>}
                <th>{t('th.byExam')}</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.w}>
                  <td>
                    {t('kw', kwOf(w.w))} · {f.short(w.w)}
                  </td>
                  <td className="r">{f.hrs(w.study + w.cards)}</td>
                  {data.settings.cards.on && <td className="r">{f.hrs(w.cards)}</td>}
                  <td>
                    <Html html={byTxt(w) || '–'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

