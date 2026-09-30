import type { ReactElement } from 'react';
import { hm, isoOf, kwOf, nowMin, num, toMin } from '../../core/dates';
import { cardsAt, dayView, type DayView, type Mod } from '../../core/planner';
import { displayClasses, type DisplayClass } from '../../core/timetable';
import { toggleDone } from '../../state/actions';
import { setUI, toast } from '../../state/store';
import { useCtx } from '../ctx';
import { av, both, Box, Dot, exLabel, exName, StatusPill, xv } from '../parts/common';
import { clsName, examById, modClass, modTip, modTitle } from '../parts/labels';
import { GLYPH } from '../../core/defaults';

export function relLabel(n: number, T: number, t: ReturnType<typeof useCtx>['i18n']['t']): string {
  const d = n - T;
  return d === 0 ? t('rel.today') : d === 1 ? t('rel.tomorrow') : d === -1 ? t('rel.yesterday') : d > 0 ? t('rel.in', d) : t('rel.ago', -d);
}

export function gotoSetup(anchor: string): void {
  setUI({ view: 'setup', anchor });
}

export function TodayView() {
  const { data, ui, plan, T, i18n } = useCtx();
  const { t, f } = i18n;
  const n = ui.dayN;
  const v = dayView(data, plan, n);
  const past = n < T;
  const st = data.settings;
  const studyMin = v.mods.filter((m) => m.type !== 'rev' && m.type !== 'new').reduce((a, m) => a + m.min, 0) + v.extras.reduce((a, m) => a + m.min, 0);
  const cardsMin = v.mods.filter((m) => m.type === 'rev' || m.type === 'new').reduce((a, m) => a + m.min, 0);
  const doneCount = v.mods.filter((m) => m.done).length;
  const typeLbl = v.exam
    ? t('day.exam')
    : v.info.holiday
      ? i18n.holiday(v.info.holiday, st.region)
      : v.info.brk && v.info.classMin === 0
        ? v.info.brk.label || t('tt.break')
        : t(`day.${v.info.type}` as 'day.free');
  const tom = data.exams.find((e) => e.date === isoOf(n + 1));
  const shorts = !past && plan.dated.length ? plan.upcoming.filter((e) => (plan.stats[e.id] || {}).status === 'short').slice(0, 2) : [];
  const hasWork = v.mods.some((m) => m.type === 'deep' || m.type === 'focus' || m.type === 'final');
  const later = !past && !hasWork && !v.exam ? plan.upcoming.map((e) => ({ e, s: plan.meta[e.id]?.start ?? e.dn })).filter((x) => x.s > n).sort((a, b) => a.s - b.s)[0] : undefined;
  return (
    <div className="today">
      <section className="card">
        <div className="viewhead">
          <div>
            <div className="kicker">
              {t('kw', kwOf(n))} · {relLabel(n, T, t)}
            </div>
            <h2 className="h2">{f.long(n)}</h2>
          </div>
          <div className="navgrp">
            <button className="iconbtn" onClick={() => setUI({ dayN: n - 1 })} aria-label={t('nav.prevDay')}>
              ‹
            </button>
            <button className="btn soft sm" onClick={() => setUI({ dayN: T })}>
              {t('nav.today')}
            </button>
            <button className="iconbtn" onClick={() => setUI({ dayN: n + 1 })} aria-label={t('nav.nextDay')}>
              ›
            </button>
          </div>
        </div>
        <div className="pills">
          <span className="pill">{typeLbl}</span>
          {v.info.classMin > 0 && <span className="pill">{t('pill.classes', f.dur(v.info.classMin))}</span>}
          {!past && studyMin + cardsMin > 0 && (
            <span className="pill" style={av('lav')}>
              {t('pill.study', f.dur(studyMin + cardsMin))}
            </span>
          )}
          {v.mods.length > 0 && (
            <span className="pill" style={av('mint')}>
              {t('pill.done', doneCount, v.mods.length)}
            </span>
          )}
        </div>
        {v.exam && (
          <div className="examday" style={xv(v.exam)}>
            <Dot lg style={av(v.exam.color)} />
            <div>
              <b>{t('examday.title', exName(v.exam, t))}</b>
              <div className="small muted">{t('examday.body')}</div>
            </div>
          </div>
        )}
        <div className="notes">
          {!plan.dated.length && (
            <Box kind="hinweis" label={t('note.addExams')}>
              <p>{t('note.addExamsBody')}</p>
              <div className="row-actions">
                <button className="btn sm" onClick={() => gotoSetup('sec-exams')}>
                  {t('note.addExamsBtn')}
                </button>
              </div>
            </Box>
          )}
          {v.info.cls.est && (
            <Box kind="hinweis" label={t('note.est')}>
              <p>{t('note.estBody', st.knownUntil ? f.short(toDn(st.knownUntil)) : '—')}</p>
            </Box>
          )}
          {v.info.holiday && !v.exam && (
            <Box kind="praxis" label={t('note.holiday')}>
              <p>{t('note.holidayBody', i18n.holiday(v.info.holiday, st.region))}</p>
            </Box>
          )}
          {tom && !past && (
            <Box kind="lerntipp" label={t('note.tomorrow')}>
              <p>{t('note.tomorrowBody', exLabel(tom, t))}</p>
            </Box>
          )}
          {later && !shorts.length && (
            <Box kind="info" label={t('note.prepLater')}>
              <p>{t('note.prepLaterBody', exLabel(later.e, t), f.day(later.s))}</p>
            </Box>
          )}
          {shorts.map((e) => {
            const s = plan.stats[e.id];
            return (
              <Box key={e.id} kind="achtung" label={t('note.short', exLabel(e, t))}>
                <p>{t('note.shortBody', Math.ceil((s.need - s.projected) / 60), f.short(e.dn))}</p>
              </Box>
            );
          })}
        </div>
        <Agenda v={v} />
      </section>
      <aside className="side">
        {st.cards.on && <CardsCard v={v} />}
        <NextExams />
        <section className="card">
          <div className="h3">{t('changed.title')}</div>
          <p className="small muted" style={{ margin: '0 0 10px' }}>
            {t('changed.body')}
          </p>
          <div className="row-actions" style={{ marginTop: 0 }}>
            <button className="btn soft sm" onClick={() => (data.exams.length ? setUI({ pane: { k: 'log' } }) : toast('toast.logNoExam'))}>
              {t('changed.log')}
            </button>
            <button className="btn soft sm" onClick={() => setUI({ pane: { k: 'appt' } })}>
              {t('changed.appt')}
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}

const toDn = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 864e5);
};

type Row =
  | { k: 'cls'; s: number; e: number; b: DisplayClass; o: number }
  | { k: 'soft'; s: number; e: number; label: string; o: number }
  | { k: 'free'; s: number; e: number; o: number }
  | { k: 'mod'; s: number | null; e: number | null; m: Mod; o: number }
  | { k: 'now'; s: number; o: number };

function Agenda({ v }: { v: DayView }) {
  const { data, plan, T, now, i18n } = useCtx();
  const { t, f } = i18n;
  const st = data.settings;
  const past = v.n < T;
  const rows: Row[] = [];
  for (const b of displayClasses(v.info.cls.items)) rows.push({ k: 'cls', s: b.s0, e: b.e0, b, o: 1 });
  if (!past) {
    const rests = (st.rest || [])
      .filter((r) => num(r.dow, -1) === v.info.w)
      .map((r) => ({ s: toMin(r.from), e: toMin(r.to), label: r.label || t('rest.default') }))
      .filter((r) => r.e > r.s);
    const winEnd = toMin(v.info.weekend ? st.weekendEnd : st.dayEnd);
    (st.meals || []).forEach((ml, i) => {
      const s = toMin(ml.from), e = toMin(ml.to);
      if (!(e > s) || v.info.busy.some(([a, b]) => a < e && b > s) || rests.some((r) => r.s <= s && r.e >= e)) return;
      rows.push({ k: 'soft', s, e, label: ml.label || (i < 2 ? t(i === 0 ? 'meal.0' : 'meal.1') : t('meal.n')), o: 3 });
    });
    for (const r of rests) rows.push({ k: 'soft', s: r.s, e: Number.isFinite(winEnd) && winEnd > r.s ? Math.min(r.e, winEnd) : r.e, label: r.label, o: 3 });
    for (const [s, e] of v.free) if (e - s >= 40) rows.push({ k: 'free', s, e, o: 4 });
  }
  for (const m of v.mods) rows.push({ k: 'mod', s: m.s, e: m.e, m, o: 2 });
  const anytime = rows.filter((r) => r.s == null);
  const timed = rows.filter((r) => r.s != null).sort((a, b) => (a.s as number) - (b.s as number) || a.o - b.o);
  const nowM = v.n === T ? nowMin(now) : -1;
  if (v.n === T) {
    const i = timed.findIndex((r) => (r.s as number) > nowM);
    timed.splice(i < 0 ? timed.length : i, 0, { k: 'now', s: nowM, o: 0 });
  }
  const time = (r: Row) =>
    r.s == null ? (
      <span className="ag-t">–</span>
    ) : (
      <span className="ag-t">
        {hm(r.s)}
        <small>{r.k !== 'now' ? hm((r as { e: number }).e) : ''}</small>
      </span>
    );
  const render = (r: Row, key: string) => {
    if (r.k === 'now')
      return (
        <li className="ag ag-now" aria-hidden="true" key={key}>
          <span className="ag-t">{hm(r.s)}</span>
          <div className="nowbar" />
        </li>
      );
    if (r.k === 'cls') {
      const b = r.b;
      const name = clsName(b, data);
      return (
        <li className="ag" key={key}>
          {time(r)}
          <button className={`clsbar${b.tent ? ' tent' : ''}${b.est ? ' est' : ''}`} onClick={() => setUI({ pane: { k: 'cls', cls: b, n: v.n } })}>
            <b>{b.t || t('class.fallback')}</b>
            {name && name !== b.t && <span className="cn">{name}</span>}
            {b.units > 1 && <span className="tag">{t('ag.units', b.units)}</span>}
            {b.on && <span className="tag">{t('ag.online')}</span>}
            {b.tent && <span className="tag">{t('ag.tent')}</span>}
            {b.est && <span className="tag">{t('ag.est')}</span>}
            {b.m && <span className="tag">{t('ag.own')}</span>}
          </button>
        </li>
      );
    }
    if (r.k === 'soft')
      return (
        <li className="ag" key={key}>
          {time(r)}
          <div className="ag-soft">
            {r.label} · {f.dur(r.e - r.s)}
          </div>
        </li>
      );
    if (r.k === 'free')
      return (
        <li className="ag" key={key}>
          {time(r)}
          <div className="ag-soft">{t('ag.free', f.dur(r.e - r.s))}</div>
        </li>
      );
    const m = r.m;
    const e = examById(data, m.exam);
    const cls = modClass(m, data);
    const missed = !m.done && v.n === T && m.e != null && m.e < nowM;
    const [lead, tip] = modTip(m, v.n, data, plan, t);
    const title = modTitle(m, data, t);
    return (
      <li className="ag" key={key}>
        {time(r)}
        <div className={`modcard ${cls}${m.done ? ' done' : ''}${missed ? ' missed' : ''}`} style={both(e)}>
          <button
            className="chk"
            aria-pressed={!!m.done}
            aria-label={`${m.done ? t('ag.markUndone') : t('ag.markDone')}: ${title}`}
            onClick={() => toggleDone(m, v.n)}
          />
          <button className="mbody" onClick={() => setUI({ pane: { k: 'mod', id: m.id, n: v.n } })}>
            <span className="mt">
              <i className="gl">{GLYPH[m.type] || '·'}</i>
              <span>{title}</span>
            </span>
            <span className="ms">
              {lead && <b>{lead} </b>}
              {tip}
            </span>
          </button>
          <span className="md">{f.dur(m.min)}</span>
        </div>
      </li>
    );
  };
  const items: ReactElement[] = [];
  if (anytime.length) {
    items.push(
      <li className="ag-group" key="g1">
        {t('ag.anytime')}
      </li>,
    );
    anytime.forEach((r, i) => items.push(render(r, `a${i}`)));
  }
  if (timed.length) {
    if (anytime.length)
      items.push(
        <li className="ag-group" key="g2">
          {t('ag.byTime')}
        </li>,
      );
    timed.forEach((r, i) => items.push(render(r, `t${i}`)));
  }
  v.extras.forEach((x, i) => items.push(render({ k: 'mod', s: null, e: null, m: x, o: 2 }, `x${i}`)));
  if (!items.length)
    items.push(
      <li className="ag-soft" key="none">
        {past ? t('ag.nothingPast') : t('ag.nothing')}
      </li>,
    );
  return <ol className="agenda">{items}</ol>;
}

function CardsCard({ v }: { v: DayView }) {
  const { data, plan, i18n } = useCtx();
  const { t, f } = i18n;
  const a = cardsAt(data, plan, v.n);
  const planned = v.mods.filter((m) => m.type === 'rev' || m.type === 'new');
  const total = planned.length ? planned.reduce((s, m) => s + m.min, 0) : a.reviews + a.learn;
  const st = data.settings.cards;
  return (
    <section className="card anki-card">
      <div className="h3">{t('cards.title')}</div>
      <div className="big">~{f.dur(total)}</div>
      <ul className="kv">
        <li>
          <span>{t('cards.reviews')}</span>
          <b>~{a.reviews} min</b>
        </li>
        {(st.generalNew > 0 || a.gen > 0) && (
          <li>
            <span>{st.generalName || t('cards.general')}</span>
            <b>{t('cards.newN', a.gen)}</b>
          </li>
        )}
        {a.decks.map((x) => (
          <li key={x.exam.id} style={av(x.exam.color)}>
            <span>
              <i className="dot" />
              {t('tip.deck', exLabel(x.exam, t))}
            </span>
            <b>{t('cards.newN', x.per)}</b>
          </li>
        ))}
      </ul>
      {a.throttled === 'paused' && a.next && <p className="small note">{t('cards.paused', exLabel(a.next, t), a.daysTo)}</p>}
      {a.throttled === 'halved' && a.next && <p className="small note">{t('cards.halved', exLabel(a.next, t), a.daysTo)}</p>}
      <p className="small muted note">
        {t('cards.hint')}
        {a.decks.length ? t('cards.hintDecks') : ''}
      </p>
    </section>
  );
}

function NextExams() {
  const { data, plan, T, i18n } = useCtx();
  const { t, f } = i18n;
  const list = plan.upcoming.slice(0, 4);
  if (!list.length)
    return (
      <section className="card">
        <div className="h3">{t('next.title')}</div>
        <p className="small muted" style={{ margin: '0 0 10px' }}>
          {t('next.none')}
        </p>
        <button className="btn soft sm" onClick={() => gotoSetup('sec-exams')}>
          {t('next.add')}
        </button>
      </section>
    );
  return (
    <section className="card">
      <div className="h3">{t('next.title')}</div>
      <ul className="nx">
        {list.map((x) => {
          const e = examById(data, x.id);
          return (
            <li key={x.id} style={av(e?.color)}>
              <span className="dot" />
              <div>
                <b>{exLabel(e, t)}</b>
                <br />
                <small>
                  {f.day(x.dn)} · {t('rel.inShort', x.dn - T)}
                </small>
              </div>
              <StatusPill st={plan.stats[x.id]} t={t} />
            </li>
          );
        })}
      </ul>
      <button className="btn ghost sm" onClick={() => setUI({ view: 'year' })}>
        {t('next.year')}
      </button>
    </section>
  );
}
