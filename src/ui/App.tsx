import { useEffect, useMemo, useState } from 'react';
import { APP_NAME } from '../config';
import { monOf, nowMin, todayDn } from '../core/dates';
import { buildPlan, streak, weekTotals } from '../core/planner';
import { plannedReminders } from '../core/reminders';
import { makeI18n, resolveLang } from '../i18n';
import { isNative, syncReminders } from '../native';
import * as A from '../state/actions';
import { setUI, useApp, type View } from '../state/store';
import { CtxR, useCtx, type Ctx } from './ctx';
import { LegalLinks } from './Legal';
import { Onboarding } from './Onboarding';
import { Panes } from './Panes';
import { av, exLabel, Html } from './parts/common';
import { reminderNotes } from './parts/reminders';
import { examById } from './parts/labels';
import { SetupView } from './views/Setup';
import { TodayView } from './views/Today';
import { WeekView } from './views/Week';
import { YearView } from './views/Year';

// When embedded (e.g. a preview frame), the host may set data-theme; "auto" keeps whatever it set.
const hostTheme = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null;

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 60_000);
    const vis = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', vis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', vis);
    };
  }, []);
  return now;
}

export function App() {
  const { data, ui, ready } = useApp();
  const now = useNow();
  const T = todayDn(now);
  const plan = useMemo(() => buildPlan(data, T), [data, T]);
  const lang = resolveLang(data.settings.lang);
  const region = data.settings.region;
  const i18n = useMemo(() => makeI18n(lang, region), [lang, region]);
  const [lastT, setLastT] = useState(T);
  useEffect(() => {
    if (T !== lastT) {
      const patch: Partial<typeof ui> = {};
      if (ui.dayN === lastT) patch.dayN = T;
      if (ui.weekMon === monOf(lastT)) patch.weekMon = monOf(T);
      setLastT(T);
      if (Object.keys(patch).length) setUI(patch);
    }
  }, [T, lastT, ui.dayN, ui.weekMon]);
  useEffect(() => {
    document.documentElement.lang = lang;
    const th = data.settings.theme;
    if (th === 'auto') {
      if (hostTheme) document.documentElement.setAttribute('data-theme', hostTheme);
      else document.documentElement.removeAttribute('data-theme');
    }
    else document.documentElement.setAttribute('data-theme', th);
  }, [lang, data.settings.theme]);
  // The hash names the view, or the open imprint/privacy notice, so each can be linked to.
  const hash = ui.pane?.k === 'legal' ? ui.pane.doc : ui.view;
  useEffect(() => {
    try {
      history.replaceState(null, '', `#${hash}`);
    } catch {
      /* sandboxed */
    }
  }, [hash]);
  // iOS app: replace the scheduled reminders shortly after the plan changes (and on each new day).
  useEffect(() => {
    if (!isNative || !ready) return;
    const id = setTimeout(() => void syncReminders(reminderNotes(plannedReminders(data, plan, T, nowMin(new Date())), data, plan, i18n)), 800);
    return () => clearTimeout(id);
  }, [ready, data, plan, T, i18n]);
  const ctx: Ctx = { data, ui, plan, T, now, i18n };
  if (!ready) return <div className="app boot" aria-busy="true" />;
  const wizard = !data.meta.onboarded || ui.wizard;
  return (
    <CtxR.Provider value={ctx}>
      {wizard ? (
        <div className="app">
          <Onboarding />
        </div>
      ) : (
        <Main />
      )}
      <Panes />
      <ToastView />
    </CtxR.Provider>
  );
}

// The tab bar sticks to the top while scrolling. Once it does, it gets the class "stuck" and widens into a top bar
// from edge to edge (app.css); --bl/--br are the distances to the window edges it grows into.
function useStuckBar() {
  useEffect(() => {
    const el = document.getElementById('tabs');
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--bl', `${r.left}px`);
      el.style.setProperty('--br', `${document.documentElement.clientWidth - r.right}px`);
      el.classList.toggle('stuck', scrollY > 0 && r.top <= parseFloat(getComputedStyle(el).top) + 0.5);
    };
    const queue = () => {
      frame ||= requestAnimationFrame(update);
    };
    update();
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('scroll', queue);
      removeEventListener('resize', queue);
    };
  }, []);
}

function Main() {
  const { data, ui, plan, T, i18n } = useCtx();
  const { t, f } = i18n;
  const next = plan.upcoming[0];
  const nextEx = next ? examById(data, next.id) : null;
  const wk = weekTotals(data, plan, monOf(T));
  const sk = streak(data, T);
  const tabs: View[] = ['today', 'week', 'year', 'setup'];
  useStuckBar();
  const go = (v: View) => {
    setUI({ view: v, pane: null });
    const el = document.getElementById('tabs');
    if (el && scrollY > el.offsetTop) scrollTo({ top: Math.max(0, el.offsetTop - 8) });
  };
  return (
    <div className="app">
      <header className="mast">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        <span className="blob b4" />
        <span className="blob b5" />
        <div className="mdots" aria-hidden="true">
          <i style={{ background: 'var(--lav-mid)' }} />
          <i style={{ background: 'var(--rose-mid)' }} />
          <i style={{ background: 'var(--mint-mid)' }} />
          <i style={{ background: 'var(--sky-mid)' }} />
          <i style={{ background: 'var(--butter-mid)' }} />
        </div>
        <div className="kicker">{APP_NAME}</div>
        <h1>{data.settings.termName || t('app.title')}</h1>
        <span className="rule" aria-hidden="true" />
        <p className="lede">{t('app.lede', data.exams.length)}</p>
        <div className="stats">
          {nextEx && next ? (
            <span className="stat" style={av(nextEx.color)}>
              <span className="dot" />
              {t('stat.next')}: <b>{exLabel(nextEx, t)}</b> {f.short(next.dn)} · {t('stat.inDays', next.dn - T)}
            </span>
          ) : (
            <span className="stat">
              <span className="dot" />
              {t('stat.noExams')}
            </span>
          )}
          <Html as="span" className="stat" html={t('stat.week', f.hrs(wk.study + wk.cards))} />
          <Html as="span" className="stat" html={t('stat.streak', sk)} />
        </div>
      </header>
      <nav className="tabs" role="tablist" aria-label={t('tabs.label')} id="tabs">
        {tabs.map((v) => (
          <button key={v} className="tab" role="tab" aria-selected={ui.view === v} aria-controls="view" onClick={() => go(v)}>
            {t(`tabs.${v}` as 'tabs.today')}
          </button>
        ))}
      </nav>
      {ui.storage === 'memory' && <div className="banner">{t('banner.memory')}</div>}
      {data.meta.example && (
        <div className="banner ex-banner">
          <span>{t('banner.example')}</span>
          <button className="btn sm" onClick={() => A.startFresh()}>
            {t('banner.exampleCta')}
          </button>
        </div>
      )}
      <main id="view" role="tabpanel">
        {ui.view === 'week' ? <WeekView /> : ui.view === 'year' ? <YearView /> : ui.view === 'setup' ? <SetupView /> : <TodayView />}
      </main>
      <p className="foot">{t('foot')}</p>
      <LegalLinks support />
    </div>
  );
}

function ToastView() {
  const { ui, i18n } = useCtx();
  const tst = ui.toast;
  useEffect(() => {
    if (!tst) return;
    const id = setTimeout(() => setUI({ toast: null }), 3200);
    return () => clearTimeout(id);
  }, [tst]);
  if (!tst) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {tst.key ? i18n.t(tst.key as 'toast.reset') : tst.msg}
    </div>
  );
}
