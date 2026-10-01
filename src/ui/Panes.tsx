import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { APP_NAME } from '../config';
import { dn, hm, isISO, isoOf, toMin } from '../core/dates';
import { GLYPH } from '../core/defaults';
import { dayView } from '../core/planner';
import * as A from '../state/actions';
import { setUI, toast, type LegalDoc } from '../state/store';
import { useCtx } from './ctx';
import { LegalText } from './Legal';
import { exLabel, exName, Fld, statusText, Toggle, xv } from './parts/common';
import { examById, modClass, modTip, modTitle } from './parts/labels';

const close = () => setUI({ pane: null });

function Shell({ children, label, focus = '[autofocus], input, select, button' }: { children: ReactNode; label: string; focus?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>(focus);
      el?.focus();
    }, 30);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, []);
  return (
    <>
      <div className="scrim" onClick={close} />
      <section className="pane" role="dialog" aria-modal="true" aria-label={label} ref={ref}>
        {children}
      </section>
    </>
  );
}

export function Panes() {
  const { ui } = useCtx();
  const p = ui.pane;
  if (!p) return null;
  if (p.k === 'mod') return <ModPane id={p.id} n={p.n} />;
  if (p.k === 'cls') return <ClsPane />;
  if (p.k === 'log') return <LogPane />;
  if (p.k === 'appt') return <ApptPane />;
  if (p.k === 'legal') return <LegalPane doc={p.doc} />;
  return null;
}

function ModPane({ id, n }: { id: string; n: number }) {
  const { data, plan, i18n } = useCtx();
  const { t, f } = i18n;
  const v = dayView(data, plan, n);
  const m = v.mods.find((x) => x.id === id) || v.extras.find((x) => x.id === id);
  if (!m) return null;
  const e = examById(data, m.exam);
  const when = m.s != null && m.e != null ? `${hm(m.s)}–${hm(m.e)}` : t('pane.anytime');
  const title = modTitle(m, data, t);
  const [lead, tip] = modTip(m, n, data, plan, t);
  return (
    <Shell label={title}>
      <div className="pane-head" style={xv(e)}>
        <span className={`pane-ico${modClass(m, data) === 'ex' ? ' ex' : ''}`}>{GLYPH[m.type] || '·'}</span>
        <div>
          <div className="kicker">
            {f.day(n)} · {when} · {f.dur(m.min)}
          </div>
          <h3 className="pane-title">{title}</h3>
        </div>
      </div>
      <p>
        {lead && <b>{lead} </b>}
        {tip}
      </p>
      {e && isISO(e.date) && <p className="small muted">{t('pane.examOn', exName(e, t), f.day(dn(e.date)), statusText(plan.stats[e.id], t))}</p>}
      <div className="row-actions">
        {m.type !== 'x' && (
          <button
            className="btn"
            onClick={() => {
              A.toggleDone(m, n);
              close();
            }}
          >
            {m.done ? t('ag.markUndone') : t('ag.markDone')}
          </button>
        )}
        <button className="btn soft" onClick={close}>
          {t('pane.close')}
        </button>
      </div>
    </Shell>
  );
}

function ClsPane() {
  const { data, ui, i18n } = useCtx();
  const { t, f } = i18n;
  if (!ui.pane || ui.pane.k !== 'cls') return null;
  const { cls: b, n } = ui.pane;
  const c = data.settings.courses[b.t] || {};
  const bits = [`${hm(b.s0)}–${hm(b.e0)}`];
  if (b.units > 1) bits.push(t('ag.units', b.units));
  if (b.on) bits.push(t('ag.online'));
  if (b.tent) bits.push(t('ag.tent'));
  const title = b.est ? t('cls.est') : `${b.t || t('class.fallback')}${c.name ? ` · ${c.name}` : ''}`;
  return (
    <Shell label={title}>
      <div className="pane-head">
        <span className="pane-ico">▦</span>
        <div>
          <div className="kicker">
            {f.day(n)} · {bits.join(' · ')}
          </div>
          <h3 className="pane-title">{title}</h3>
        </div>
      </div>
      {b.est ? (
        <p>{t('cls.estBody')}</p>
      ) : b.m ? (
        <p>{t('cls.own')}</p>
      ) : (
        <div className="form">
          <Fld id="pc-exam" label={t('cls.counts')}>
            <select id="pc-exam" value={c.exam || ''} onChange={(ev) => A.setCourse(b.t, { exam: ev.target.value })}>
              <option value="">{t('tt.noExam')}</option>
              {data.exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {exLabel(e, t)}
                  {e.name && e.name !== e.short ? ` · ${e.name}` : ''}
                </option>
              ))}
            </select>
          </Fld>
          <Toggle id="pc-busy" checked={c.busy !== false} onChange={(v) => A.setCourse(b.t, { busy: v })}>
            {t('tt.blocks')}
          </Toggle>
        </div>
      )}
      <div className="row-actions">
        {b.m && (
          <button
            className="btn warn"
            onClick={() => {
              A.deleteAppt(b.raw, n);
              close();
            }}
          >
            {t('cls.delete')}
          </button>
        )}
        <button className="btn soft" onClick={close}>
          {t('pane.close')}
        </button>
      </div>
    </Shell>
  );
}

function LogPane() {
  const { data, ui, T, i18n } = useCtx();
  const { t, f } = i18n;
  const [exam, setExam] = useState(data.exams[0]?.id || '');
  const [min, setMin] = useState('45');
  const [date, setDate] = useState(isoOf(ui.dayN <= T ? ui.dayN : T));
  const [note, setNote] = useState('');
  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const m = Math.round(Number(min));
    if (!(m > 0) || !isISO(date)) {
      toast('toast.logNeed');
      return;
    }
    A.logExtra(exam, m, date, note.trim());
    close();
    toast({ msg: t('toast.logged', f.dur(m)) });
  };
  return (
    <Shell label={t('log.title')}>
      <div className="pane-head">
        <span className="pane-ico">+</span>
        <div>
          <div className="kicker">{t('log.kicker')}</div>
          <h3 className="pane-title">{t('log.title')}</h3>
        </div>
      </div>
      <form className="form" onSubmit={submit}>
        <Fld id="lg-exam" label={t('log.exam')}>
          <select id="lg-exam" value={exam} onChange={(ev) => setExam(ev.target.value)}>
            {data.exams.map((e) => (
              <option key={e.id} value={e.id}>
                {exLabel(e, t)}
                {e.name && e.name !== e.short ? ` · ${e.name}` : ''}
              </option>
            ))}
          </select>
        </Fld>
        <div className="fgrid">
          <Fld id="lg-min" label={t('log.min')}>
            <input id="lg-min" type="number" min={5} max={600} step={5} value={min} onChange={(ev) => setMin(ev.target.value)} />
          </Fld>
          <Fld id="lg-date" label={t('log.date')}>
            <input id="lg-date" type="date" value={date} onChange={(ev) => setDate(ev.target.value)} />
          </Fld>
        </div>
        <Fld id="lg-note" label={t('log.note')}>
          <input id="lg-note" type="text" maxLength={120} placeholder={t('log.notePh')} value={note} onChange={(ev) => setNote(ev.target.value)} />
        </Fld>
        <div className="row-actions">
          <button className="btn" type="submit">
            {t('log.submit')}
          </button>
          <button className="btn soft" type="button" onClick={close}>
            {t('cancel')}
          </button>
        </div>
      </form>
    </Shell>
  );
}

function ApptPane() {
  const { ui, i18n } = useCtx();
  const { t } = i18n;
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(isoOf(ui.dayN));
  const [from, setFrom] = useState('14:00');
  const [to, setTo] = useState('15:30');
  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (!title.trim() || !isISO(date) || !(toMin(to) > toMin(from))) {
      toast('toast.apptNeed');
      return;
    }
    A.addAppt(date, from, to, title.trim());
    close();
    toast('toast.apptAdded');
  };
  return (
    <Shell label={t('appt.title')}>
      <div className="pane-head">
        <span className="pane-ico">▦</span>
        <div>
          <div className="kicker">{t('appt.kicker')}</div>
          <h3 className="pane-title">{t('appt.title')}</h3>
        </div>
      </div>
      <form className="form" onSubmit={submit}>
        <Fld id="ap-title" label={t('appt.name')}>
          <input id="ap-title" type="text" maxLength={40} required placeholder={t('appt.namePh')} value={title} onChange={(ev) => setTitle(ev.target.value)} autoFocus />
        </Fld>
        <div className="fgrid">
          <Fld id="ap-date" label={t('log.date')}>
            <input id="ap-date" type="date" required value={date} onChange={(ev) => setDate(ev.target.value)} />
          </Fld>
          <Fld id="ap-from" label={t('tt.from')}>
            <input id="ap-from" type="time" required value={from} onChange={(ev) => setFrom(ev.target.value)} />
          </Fld>
          <Fld id="ap-to" label={t('tt.to')}>
            <input id="ap-to" type="time" required value={to} onChange={(ev) => setTo(ev.target.value)} />
          </Fld>
        </div>
        <div className="row-actions">
          <button className="btn" type="submit">
            {t('appt.submit')}
          </button>
          <button className="btn soft" type="button" onClick={close}>
            {t('cancel')}
          </button>
        </div>
      </form>
    </Shell>
  );
}

function LegalPane({ doc }: { doc: LegalDoc }) {
  const { i18n } = useCtx();
  const { t } = i18n;
  const head = useRef<HTMLDivElement>(null);
  useEffect(() => {
    head.current?.closest('.pane')?.scrollTo({ top: 0 });
  }, [doc]);
  const title = doc === 'imprint' ? t('legal.imprint') : t('pv.title');
  return (
    <Shell label={title} focus='[aria-selected="true"]'>
      <div className="pane-head" ref={head}>
        <span className="pane-ico">§</span>
        <div>
          <div className="kicker">
            {APP_NAME} · {t('legal.kicker')}
          </div>
          <h3 className="pane-title">{title}</h3>
        </div>
      </div>
      <div className="tabs legal-tabs" role="tablist" aria-label={t('legal.links')}>
        {(['imprint', 'privacy'] as const).map((d) => (
          <button key={d} className="tab" role="tab" aria-selected={d === doc} aria-controls="legal-doc" onClick={() => setUI({ pane: { k: 'legal', doc: d } })}>
            {d === 'imprint' ? t('legal.imprint') : t('legal.privacy')}
          </button>
        ))}
      </div>
      <LegalText doc={doc} />
      <div className="row-actions">
        <button className="btn soft" onClick={close}>
          {t('pane.close')}
        </button>
      </div>
    </Shell>
  );
}
