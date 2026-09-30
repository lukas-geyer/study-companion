import { useEffect, useState } from 'react';
import { dayOfMonth, dn, dowOf, hm, isISO, kwOf, monOf, nowMin, pad, toMin } from '../../core/dates';
import { dayView, weekTotals, type DayView } from '../../core/planner';
import { displayClasses } from '../../core/timetable';
import { setUI } from '../../state/store';
import { useCtx } from '../ctx';
import { av, Box, exLabel, xv, type Vars } from '../parts/common';
import { blkLabel, examById, modClass, modTitle } from '../parts/labels';
import { gotoSetup } from './Today';

function useNarrow(): boolean {
  const q = '(max-width: 640px)';
  const get = () => (typeof matchMedia !== 'undefined' ? matchMedia(q).matches : false);
  const [narrow, setNarrow] = useState(get);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const m = matchMedia(q);
    const on = () => setNarrow(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return narrow;
}

export function WeekView() {
  const { data, ui, plan, T, i18n } = useCtx();
  const { t, f } = i18n;
  const st = data.settings;
  const mon = ui.weekMon;
  const hp = useNarrow() ? 30 : 38;
  const views: DayView[] = [];
  for (let i = 0; i < 7; i++) views.push(dayView(data, plan, mon + i));
  const starts = [toMin(st.dayStart), toMin(st.weekendStart), ...views.flatMap((v) => v.info.cls.items.map((x) => toMin(x.s)))].filter(Number.isFinite);
  const ends = [toMin(st.dayEnd), toMin(st.weekendEnd), ...views.flatMap((v) => v.info.cls.items.map((x) => toMin(x.e)))].filter(Number.isFinite);
  const H0 = Math.max(0, Math.min(7, Math.floor(Math.min(...starts) / 60)));
  const H1 = Math.min(24, Math.max(20, Math.ceil(Math.max(...ends) / 60)));
  const tot = weekTotals(data, plan, mon);
  const hours = [];
  for (let h = H0; h <= H1; h++)
    hours.push(
      <span key={h} style={{ top: (h - H0) * hp }}>
        {pad(h)}
      </span>,
    );
  const byExam = Object.entries(tot.by).sort((a, b) => b[1] - a[1]);
  return (
    <section className="card week">
      <div className="viewhead">
        <div>
          <div className="kicker">
            {t('kw', kwOf(mon))}
            {monOf(T) === mon ? ` · ${t('nav.thisWeekTag')}` : ''}
          </div>
          <h2 className="h2">{f.range(mon, mon + 6)}</h2>
        </div>
        <div className="navgrp">
          <button className="iconbtn" onClick={() => setUI({ weekMon: mon - 7 })} aria-label={t('nav.prevWeek')}>
            ‹
          </button>
          <button className="btn soft sm" onClick={() => setUI({ weekMon: monOf(T) })}>
            {t('nav.thisWeek')}
          </button>
          <button className="iconbtn" onClick={() => setUI({ weekMon: mon + 7 })} aria-label={t('nav.nextWeek')}>
            ›
          </button>
        </div>
      </div>
      <div className="chips">
        <span className="chip">
          {t('week.chipClasses')} <b>{f.hrs(tot.classes)}</b>
        </span>
        <span className="chip">
          {t('week.chipStudy')} <b>{f.hrs(tot.study)}</b>
        </span>
        {st.cards.on && (
          <span className="chip">
            {t('week.chipCards')} <b>{f.hrs(tot.cards)}</b>
          </span>
        )}
        {byExam.map(([id, m]) => {
          const e = examById(data, id);
          return e ? (
            <span className="chip" key={id} style={av(e.color)}>
              <span className="dot" />
              {exLabel(e, t)} <b>{f.hrs(m)}</b>
            </span>
          ) : null;
        })}
      </div>
      {(views.some((v) => v.info.cls.est) || !plan.dated.length) && (
        <div className="notes">
          {views.some((v) => v.info.cls.est) && (
            <Box kind="hinweis" label={t('note.est')}>
              <p>{t('week.estBody', isISO(st.knownUntil) ? f.short(dn(st.knownUntil)) : '—')}</p>
            </Box>
          )}
          {!plan.dated.length && (
            <Box kind="hinweis" label={t('note.addExams')}>
              <p>{t('week.noExamsBody')}</p>
              <div className="row-actions">
                <button className="btn sm" onClick={() => gotoSetup('sec-exams')}>
                  {t('note.addExamsBtn')}
                </button>
              </div>
            </Box>
          )}
        </div>
      )}
      <div className="wk" style={{ '--hp': `${hp}px`, '--rows': String(H1 - H0) } as Vars}>
        <div className="wk-head">
          <span />
          {views.map((v) => (
            <button
              key={v.n}
              className={`wk-dh${v.n === T ? ' is-today' : ''}${v.exam ? ' has-exam' : ''}`}
              onClick={() => setUI({ dayN: v.n, view: 'today' })}
              aria-label={t('week.open', f.long(v.n))}
            >
              <span>{f.wd2(dowOf(v.n))}</span>
              <b>{dayOfMonth(v.n)}</b>
            </button>
          ))}
        </div>
        <div className="wk-body">
          <div className="wk-times">{hours}</div>
          {views.map((v) => (
            <WeekCol key={v.n} v={v} H0={H0} H1={H1} hp={hp} />
          ))}
        </div>
      </div>
      <div className="legend">
        <span className="lg">
          <i className="sw cls" />
          {t('lg.class')}
        </span>
        <span className="lg">
          <i className="sw tent" />
          {t('lg.tent')}
        </span>
        <span className="lg">
          <i className="sw est" />
          {t('lg.est')}
        </span>
        {st.cards.on && (
          <span className="lg">
            <i className="sw anki" />
            {t('lg.cards')}
          </span>
        )}
        <span className="lg">
          <i className="sw mod" />
          {t('lg.blocks', st.deepMin, st.focusMin)}
        </span>
        {data.exams
          .filter((e) => isISO(e.date))
          .map((e) => (
            <span className="lg" key={e.id} style={av(e.color)}>
              <span className="dot" />
              {exLabel(e, t)}
            </span>
          ))}
      </div>
    </section>
  );
}

function WeekCol({ v, H0, H1, hp }: { v: DayView; H0: number; H1: number; hp: number }) {
  const { data, T, now, i18n } = useCtx();
  const { t } = i18n;
  const y = (m: number) => ((Math.min(Math.max(m, H0 * 60), H1 * 60) - H0 * 60) / 60) * hp;
  const nm = nowMin(now);
  return (
    <div className={`wk-col${v.n === T ? ' is-today' : ''}`}>
      {v.exam && (
        <div className="wk-exam" style={xv(v.exam)}>
          <span>
            {exLabel(v.exam, t)}
            <br />
            {t('week.examMark')}
          </span>
        </div>
      )}
      {displayClasses(v.info.cls.items).map((b, i) => {
        const top = y(b.s0);
        const ht = Math.max(10, y(b.e0) - top - 2);
        return (
          <button
            key={`c${i}`}
            className={`blk cls${b.tent ? ' tent' : ''}${b.est ? ' est' : ''}`}
            style={{ top, height: ht }}
            onClick={() => setUI({ pane: { k: 'cls', cls: b, n: v.n } })}
            aria-label={`${b.t || t('class.fallback')}, ${hm(b.s0)}–${hm(b.e0)}`}
          >
            <span>{b.t || t('class.fallback')}</span>
            {ht >= 30 && <small>{hm(b.s0)}</small>}
          </button>
        );
      })}
      {v.mods.map((m) => {
        if (m.s == null || m.e == null) return null;
        const top = y(m.s);
        const ht = Math.max(9, y(m.e) - top - 2);
        const e = examById(data, m.exam);
        return (
          <button
            key={m.id}
            className={`blk mod ${modClass(m, data)}${m.done ? ' done' : ''}`}
            style={{ top, height: ht, ...xv(e), ...av(e?.color) }}
            onClick={() => setUI({ pane: { k: 'mod', id: m.id, n: v.n } })}
            aria-label={`${modTitle(m, data, t)}, ${hm(m.s)}–${hm(m.e)}`}
          >
            <span>{blkLabel(m, data, t)}</span>
            {ht >= 30 && <small>{m.min}′</small>}
          </button>
        );
      })}
      {v.n === T && nm > H0 * 60 && nm < H1 * 60 && <div className="wk-now" style={{ top: y(nm) }} aria-hidden="true" />}
    </div>
  );
}
