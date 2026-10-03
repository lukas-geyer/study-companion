import { useEffect, useRef, useState, type ReactNode } from 'react';
import { dn, isISO, num, todayDn } from '../../core/dates';
import { MAX_DECKS, MAX_EXAMS, SIZES } from '../../core/defaults';
import { REGIONS } from '../../core/holidays';
import { previewICS, type IcsPreview } from '../../core/ics';
import { deckPerDay } from '../../core/cards';
import type { Deck, Exam, Size } from '../../core/types';
import { askNotifications, isNative, notificationsState, type NotifState } from '../../native';
import * as A from '../../state/actions';
import { setUI, toast } from '../../state/store';
import { useCtx } from '../ctx';
import { av, Box, CommitInput, Confirm, esc, exFull, exLabel, Fld, Html, numOr, PickInput, Toggle } from '../parts/common';
import { Fold, setFold } from '../parts/Fold';
import { deckLabel, examById } from '../parts/labels';
import { DataSection } from './SetupData';

const DOWS = [1, 2, 3, 4, 5, 6, 0];

export function SetupView() {
  const { ui, i18n } = useCtx();
  const { t } = i18n;
  useEffect(() => {
    if (!ui.anchor) return;
    const id = ui.anchor;
    setFold(id, true); // a link to a section opens it
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
      setUI({ anchor: '' });
    });
  }, [ui.anchor]);
  return (
    <div className="stack">
      <Fold id="sec-how" color="lilac" title={t('setup.howKicker')} hint={t('fold.how')}>
        <ol className="steps">
          <li>
            <b>1 · {t('setup.step1')}</b>
            {t('setup.step1b')}
          </li>
          <li>
            <b>2 · {t('setup.step2')}</b>
            {t('setup.step2b')}
          </li>
          <li>
            <b>3 · {t('setup.step3')}</b>
            {t('setup.step3b')}
          </li>
          <li>
            <b>4 · {t('setup.step4')}</b>
            {t('setup.step4b')}
          </li>
        </ol>
      </Fold>
      <ExamsSection />
      <TimetableSection />
      <RhythmSection />
      <CardsSection />
      {isNative && <RemindersSection />}
      <PrefsSection />
      <DataSection />
    </div>
  );
}

// ---------------------------------------------------------------- exams
export function ExamsSection({ compact }: { compact?: boolean }) {
  const { data, i18n } = useCtx();
  const { t } = i18n;
  const [confirm, setConfirm] = useState<string | null>(null);
  const add = () => {
    const id = A.addExam();
    setTimeout(() => document.getElementById(`ex-${id}-name`)?.focus(), 60);
  };
  const body = (
    <>
      <div className="ex-list">
        {data.exams.length ? (
          data.exams.map((e, i) => <ExamRow key={e.id} e={e} k={i + 1} confirm={confirm === e.id} setConfirm={setConfirm} />)
        ) : (
          <p className="small muted">{t('ex.none')}</p>
        )}
      </div>
      {data.exams.length < MAX_EXAMS && (
        <div className="row-actions">
          <button className="btn soft" onClick={add}>
            {t('ex.add')}
          </button>
        </div>
      )}
    </>
  );
  if (compact) return body;
  return (
    <Fold id="sec-exams" color="lav" title={t('ex.title')} hint={t('fold.exams')}>
      <Html as="p" className="sub" html={t('ex.sub')} />
      {body}
    </Fold>
  );
}

function ExamRow({ e, k, confirm, setConfirm }: { e: Exam; k: number; confirm: boolean; setConfirm: (id: string | null) => void }) {
  const { i18n } = useCtx();
  const { t } = i18n;
  const id = `ex-${e.id.replace(/[^A-Za-z0-9_-]/g, '_')}`;
  const up = (patch: Partial<Exam>) => A.updateExam(e.id, patch);
  const label = exLabel(e, t) || t('ex.namePh', k);
  return (
    <div className="ex-row" style={av(e.color)}>
      <span className="dot lg" />
      <Fld id={`${id}-short`} label={t('ex.short')} className="f-short">
        <CommitInput id={`${id}-short`} value={e.short} maxLength={8} onCommit={(v) => up({ short: v.trim() })} />
      </Fld>
      <Fld id={`${id}-name`} label={t('ex.name')} className="f-name">
        <CommitInput id={`${id}-name`} value={e.name} maxLength={60} placeholder={t('ex.namePh', k)} onCommit={(v) => up({ name: v.trim() })} />
      </Fld>
      <Fld id={`${id}-date`} label={t('ex.date')} className="f-date">
        <PickInput id={`${id}-date`} type="date" value={e.date} onCommit={(v) => up({ date: v })} />
      </Fld>
      <Fld id={`${id}-size`} label={t('ex.size')} className="f-size">
        <select id={`${id}-size`} value={e.size} onChange={(ev) => up({ size: ev.target.value as Size })}>
          {(['S', 'M', 'L'] as Size[]).map((s) => (
            <option key={s} value={s}>
              {s} · {SIZES[s].hours} h
            </option>
          ))}
        </select>
      </Fld>
      <Fld id={`${id}-hours`} label={t('ex.hours')} className="f-hours">
        <CommitInput id={`${id}-hours`} type="number" min={0} max={400} step={5} value={e.hours} onCommit={(v) => up({ hours: Math.max(0, numOr(v)) })} />
      </Fld>
      <Fld id={`${id}-weeks`} label={t('ex.weeks')} className="f-weeks">
        <CommitInput id={`${id}-weeks`} type="number" min={1} max={30} step={1} value={e.weeks} onCommit={(v) => up({ weeks: Math.max(1, Math.round(numOr(v, 1))) })} />
      </Fld>
      <button className="iconbtn del" onClick={() => setConfirm(e.id)} aria-label={t('ex.remove', label)}>
        ×
      </button>
      {confirm && (
        <Confirm
          q={t('ex.removeQ', label)}
          yes={t('ex.removeYes')}
          onYes={() => {
            setConfirm(null);
            A.deleteExam(e.id);
          }}
          onNo={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- timetable
export function IcsImport() {
  const { i18n } = useCtx();
  const { t, f } = i18n;
  const [p, setP] = useState<IcsPreview | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const onFile = async (fl: File | undefined) => {
    if (!fl) return;
    try {
      const prev = previewICS(await fl.text());
      if (!prev) toast('toast.noEvents');
      setP(prev);
    } catch {
      toast('toast.badIcs');
    }
  };
  const codes = p ? (p.codes.length ? ` (${esc(p.codes.slice(0, 8).join(', '))}${p.codes.length > 8 ? ', …' : ''})` : '') : '';
  return (
    <>
      <div className="row-actions" style={{ marginTop: 0 }}>
        <button
          className="btn soft"
          onClick={() => {
            if (file.current) {
              file.current.value = '';
              file.current.click();
            }
          }}
        >
          {t('tt.import')}
        </button>
      </div>
      <input ref={file} type="file" accept=".ics,text/calendar" hidden onChange={(ev) => onFile(ev.target.files?.[0])} />
      {p && (
        <div style={{ marginTop: 12 }}>
          <Box kind="hinweis" label={t('tt.import')}>
            <Html as="p" html={t('tt.found', p.events.length, esc(f.short(p.first)), esc(`${f.short(p.last)} ${new Date(p.last * 864e5).getUTCFullYear()}`), p.weeks, codes)} />
            <div className="row-actions">
              <button
                className="btn sm"
                onClick={() => {
                  A.importICS(p);
                  toast({ msg: t('toast.imported', p.events.length) });
                  setP(null);
                }}
              >
                {t('tt.importBtn')}
              </button>
              <button className="btn soft sm" onClick={() => setP(null)}>
                {t('cancel')}
              </button>
            </div>
          </Box>
        </div>
      )}
    </>
  );
}

export function TemplateWeek() {
  const { data, i18n } = useCtx();
  const { t, f } = i18n;
  const tpl = data.settings.template;
  return (
    <div className="tplw">
      {DOWS.map((d) => {
        const slots = tpl[String(d)] || [];
        return (
          <div className="tplw-day" key={d}>
            <div className="tplw-name">{f.wd2(d)}</div>
            <div className="tplw-slots">
              {slots.map((s, i) => (
                <div className="tplw-slot" key={i}>
                  <PickInput id={`tpl-${d}-${i}-from`} type="time" value={s.from} ariaLabel={`${f.wdLong(d)} ${t('tt.from')}`} onCommit={(v) => A.updateTplSlot(d, i, { from: v })} />
                  <span className="tplw-dash">–</span>
                  <PickInput id={`tpl-${d}-${i}-to`} type="time" value={s.to} ariaLabel={`${f.wdLong(d)} ${t('tt.to')}`} onCommit={(v) => A.updateTplSlot(d, i, { to: v })} />
                  <CommitInput id={`tpl-${d}-${i}-title`} value={s.title || ''} placeholder={t('tt.slotTitle')} maxLength={24} ariaLabel={`${f.wdLong(d)} ${t('tt.slotTitle')}`} onCommit={(v) => A.updateTplSlot(d, i, { title: v.trim() })} />
                  <button className="iconbtn sm" onClick={() => A.removeTplSlot(d, i)} aria-label={`${t('tt.remove')}: ${f.wdLong(d)} ${s.from}–${s.to}`}>
                    ×
                  </button>
                </div>
              ))}
              <button className="tchip" onClick={() => A.addTplSlot(d)} aria-label={`${t('tt.addSlot')}: ${f.wdLong(d)}`}>
                + {t('tt.addSlot')}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimetableSection() {
  const { data, i18n } = useCtx();
  const { t, f } = i18n;
  const st = data.settings;
  const wks = Object.keys(data.weeks)
    .filter((k) => (data.weeks[k].items || []).length)
    .sort();
  const codes = new Set<string>();
  for (const k of wks) for (const x of data.weeks[k].items || []) if (!x.m && x.t) codes.add(x.t);
  for (const d of Object.keys(st.template)) for (const s of st.template[d] || []) if (s.title) codes.add(s.title.trim());
  for (const c of Object.keys(st.courses)) if (c) codes.add(c);
  const online = (code: string) => wks.some((k) => (data.weeks[k].items || []).some((x) => x.t === code && x.on));
  return (
    <Fold id="sec-tt" color="grey" title={t('tt.title')} hint={t('fold.tt')}>
      <p className="sub">{t('tt.sub')}</p>
      <IcsImport />
      <p className="small muted" style={{ margin: '10px 0 0' }}>
        {t('tt.importHelp')}
      </p>
      <div className="grp">
        <span className="lbl">{t('tt.weeks')}</span>
        {wks.length ? (
          <div className="wklist">
            {wks.map((k) => (
              <span className="chip" key={k}>
                {t('kw', Number(k.slice(-2)))} <b>{data.weeks[k].items.length}</b>
              </span>
            ))}
          </div>
        ) : (
          <p className="small muted">{t('tt.noWeeks')}</p>
        )}
        {isISO(st.knownUntil) && (
          <div className="fgrid" style={{ marginTop: 10 }}>
            <Fld id="set-knownUntil" label={t('tt.knownUntil')}>
              <PickInput id="set-knownUntil" type="date" value={st.knownUntil} onCommit={(v) => A.setSetting('knownUntil', v)} />
            </Fld>
          </div>
        )}
        <div className="row-actions">
          <button className="btn soft sm" onClick={() => setUI({ pane: { k: 'appt' } })}>
            {t('changed.appt')}
          </button>
        </div>
      </div>
      <div className="grp">
        <span className="lbl">{t('tt.template')}</span>
        <p className="small muted" style={{ margin: '0 0 10px' }}>
          {t('tt.templateHelp')}
        </p>
        <TemplateWeek />
      </div>
      <div className="grp">
        <span className="lbl">{t('tt.courses')}</span>
        <p className="small muted" style={{ margin: '0 0 4px' }}>
          {t('tt.coursesHelp')}
        </p>
        {codes.size ? (
          [...codes].sort().map((code) => {
            const c = st.courses[code] || {};
            const id = 'co-' + code.replace(/[^A-Za-z0-9]/g, '_');
            return (
              <div className="co-row" key={code}>
                <div className="code">
                  {code}
                  <small>{online(code) ? t('tt.online') : t('tt.inPerson')}</small>
                </div>
                <CommitInput id={`${id}-name`} value={c.name || ''} placeholder={t('tt.courseName')} ariaLabel={`${code}: ${t('tt.courseName')}`} onCommit={(v) => A.setCourse(code, { name: v.trim() })} />
                <select id={`${id}-exam`} aria-label={`${code}: ${t('cls.counts')}`} value={c.exam || ''} onChange={(ev) => A.setCourse(code, { exam: ev.target.value })}>
                  <option value="">{t('tt.noExam')}</option>
                  {data.exams.map((e) => (
                    <option key={e.id} value={e.id}>
                      {exFull(e, t)}
                    </option>
                  ))}
                </select>
                <Toggle id={`${id}-busy`} checked={c.busy !== false} onChange={(v) => A.setCourse(code, { busy: v })}>
                  {t('tt.blocks')}
                </Toggle>
              </div>
            );
          })
        ) : (
          <p className="small muted">{t('tt.coursesNone')}</p>
        )}
        <div style={{ marginTop: 10 }}>
          <Toggle id="set-tentativeBusy" checked={st.tentativeBusy} onChange={(v) => A.setSetting('tentativeBusy', v)}>
            {t('tt.tentBusy')}
          </Toggle>
        </div>
      </div>
      <div className="grp">
        <span className="lbl">{t('tt.breaks')}</span>
        {st.breaks.map((b, i) => (
          <div className="brk-row" key={i}>
            <Fld id={`brk-${i}-label`} label={t('tt.break')}>
              <CommitInput id={`brk-${i}-label`} value={b.label} onCommit={(v) => A.updateBreak(i, { label: v })} />
            </Fld>
            <Fld id={`brk-${i}-from`} label={t('tt.from')}>
              <PickInput id={`brk-${i}-from`} type="date" value={b.from} onCommit={(v) => A.updateBreak(i, { from: v })} />
            </Fld>
            <Fld id={`brk-${i}-to`} label={t('tt.to')}>
              <PickInput id={`brk-${i}-to`} type="date" value={b.to} onCommit={(v) => A.updateBreak(i, { to: v })} />
            </Fld>
            <button className="iconbtn" onClick={() => A.removeBreak(i)} aria-label={`${t('tt.remove')}: ${b.label || t('tt.break')}`}>
              ×
            </button>
          </div>
        ))}
        <div className="row-actions">
          <button className="btn soft sm" onClick={() => A.addBreak(t('tt.break'))}>
            {t('tt.addBreak')}
          </button>
        </div>
        {isISO(st.knownUntil) && dn(st.knownUntil) < todayDn() && (
          <p className="small muted" style={{ marginTop: 8 }}>
            {t('note.estBody', f.short(dn(st.knownUntil)))}
          </p>
        )}
      </div>
    </Fold>
  );
}

// ---------------------------------------------------------------- rhythm
/** A setting by its dotted path (as A.setSetting takes it), and the field id derived from that path. */
function useSetting(path: string): [unknown, string] {
  const { data } = useCtx();
  const v = path.split('.').reduce<unknown>((a, k) => (a == null ? undefined : (a as Record<string, unknown>)[k]), data.settings);
  return [v, 'set-' + path.replace(/\./g, '-')];
}
function NumSet({ path, label, min, max, step }: { path: string; label: string; min: number; max: number; step: number }) {
  const [v, id] = useSetting(path);
  return (
    <Fld id={id} label={label}>
      <CommitInput id={id} type="number" min={min} max={max} step={step} value={num(v)} onCommit={(x) => A.setSetting(path, Math.min(max, Math.max(min, numOr(x, min))))} />
    </Fld>
  );
}
function TimeSet({ path, label }: { path: string; label: string }) {
  const [v, id] = useSetting(path);
  return (
    <Fld id={id} label={label}>
      <PickInput id={id} type="time" value={String(v || '')} onCommit={(x) => A.setSetting(path, x)} />
    </Fld>
  );
}
function DowSet({ path, label, allowNone }: { path: string; label: string; allowNone?: boolean }) {
  const { i18n } = useCtx();
  const [raw, id] = useSetting(path);
  const v = num(raw, 0);
  return (
    <Fld id={id} label={label}>
      <select id={id} value={v} onChange={(ev) => A.setSetting(path, Number(ev.target.value))}>
        {DOWS.map((d) => (
          <option key={d} value={d}>
            {i18n.f.wdLong(d)}
          </option>
        ))}
        {allowNone && <option value={-1}>{i18n.t('rh.none')}</option>}
      </select>
    </Fld>
  );
}

function Grp({ label, children, first }: { label: string; children: ReactNode; first?: boolean }) {
  return (
    <div className="grp" style={first ? { border: 0, paddingTop: 0, marginTop: 0 } : undefined}>
      <span className="lbl">{label}</span>
      {children}
    </div>
  );
}

function RhythmSection() {
  const { data, i18n } = useCtx();
  const { t } = i18n;
  const st = data.settings;
  return (
    <Fold id="sec-rhythm" color="mint" title={t('rh.title')} hint={t('fold.rhythm')}>
      <p className="sub">{t('rh.sub')}</p>
      <Grp label={t('rh.caps')} first>
        <div className="fgrid">
          <NumSet path="caps.free" label={t('rh.capFree')} min={0} max={14} step={0.5} />
          <NumSet path="caps.half" label={t('rh.capHalf')} min={0} max={14} step={0.5} />
          <NumSet path="caps.full" label={t('rh.capFull')} min={0} max={14} step={0.5} />
          <NumSet path="caps.sat" label={t('rh.capSat')} min={0} max={14} step={0.5} />
          <NumSet path="caps.sun" label={t('rh.capSun')} min={0} max={14} step={0.5} />
          <NumSet path="halfThreshold" label={t('rh.threshold')} min={1} max={12} step={0.5} />
        </div>
      </Grp>
      <Grp label={t('rh.window')}>
        <div className="fgrid">
          <TimeSet path="dayStart" label={t('rh.dayStart')} />
          <TimeSet path="dayEnd" label={t('rh.dayEnd')} />
          <TimeSet path="weekendStart" label={t('rh.weStart')} />
          <TimeSet path="weekendEnd" label={t('rh.weEnd')} />
          <NumSet path="bufferBefore" label={t('rh.bufBefore')} min={0} max={60} step={5} />
          <NumSet path="bufferAfter" label={t('rh.bufAfter')} min={0} max={90} step={5} />
        </div>
      </Grp>
      <Grp label={t('rh.blocks')}>
        <div className="fgrid">
          <NumSet path="deepMin" label={t('rh.deep')} min={45} max={180} step={15} />
          <NumSet path="focusMin" label={t('rh.focus')} min={20} max={90} step={5} />
          <NumSet path="breakMin" label={t('rh.break')} min={0} max={45} step={5} />
          <NumSet path="pace" label={t('rh.pace')} min={0} max={50} step={5} />
        </div>
        <div style={{ marginTop: 8 }}>
          <Toggle id="set-autoExtend" checked={st.autoExtend} onChange={(v) => A.setSetting('autoExtend', v)}>
            {t('rh.autoExtend')}
          </Toggle>
        </div>
      </Grp>
      <Grp label={t('rh.meals')}>
        <div className="fgrid">
          <TimeSet path="meals.0.from" label={t('rh.lunchFrom')} />
          <TimeSet path="meals.0.to" label={t('rh.lunchTo')} />
          <TimeSet path="meals.1.from" label={t('rh.dinnerFrom')} />
          <TimeSet path="meals.1.to" label={t('rh.dinnerTo')} />
          <DowSet path="rest.0.dow" label={t('rh.offOn')} allowNone />
          <TimeSet path="rest.0.from" label={t('rh.offFrom')} />
          <TimeSet path="rest.0.to" label={t('rh.offTo')} />
        </div>
      </Grp>
      <Grp label={t('rh.fuWr')}>
        <div className="fgrid">
          <NumSet path="followUp.min" label={t('rh.fuMin')} min={10} max={90} step={5} />
          <NumSet path="followUp.minClassH" label={t('rh.fuAfter')} min={1} max={10} step={0.5} />
          <DowSet path="weekly.dow" label={t('rh.wrOn')} />
          <NumSet path="weekly.min" label={t('rh.wrMin')} min={10} max={90} step={5} />
        </div>
        <div className="row-actions">
          <Toggle id="set-fu-on" checked={st.followUp.on} onChange={(v) => A.setSetting('followUp.on', v)}>
            {t('rh.fuToggle')}
          </Toggle>
          <Toggle id="set-wr-on" checked={st.weekly.on} onChange={(v) => A.setSetting('weekly.on', v)}>
            {t('rh.wrToggle')}
          </Toggle>
        </div>
      </Grp>
    </Fold>
  );
}

// ---------------------------------------------------------------- flashcards
export function CardsFields({ compact }: { compact?: boolean }) {
  const { data, i18n } = useCtx();
  const { t } = i18n;
  const c = data.settings.cards;
  const turn = (on: boolean) => {
    A.setSetting('cards.on', on);
    if (on && !data.decks.length) addDeckAndFocus(); // saying yes opens the first deck right away
  };
  return (
    <>
      <Toggle id="set-cards-on" checked={c.on} onChange={turn}>
        {t('fc.on')}
      </Toggle>
      {c.on && (
        <>
          <DeckList />
          {!compact && (
            <>
              <div className="fgrid" style={{ marginTop: 12 }}>
                <NumSet path="cards.override" label={t('fc.override')} min={0} max={300} step={5} />
                <Fld id="set-startDate" label={t('fc.start')}>
                  <PickInput id="set-startDate" type="date" value={data.settings.startDate} onCommit={(v) => A.setSetting('startDate', v)} />
                </Fld>
              </div>
              <div style={{ marginTop: 8 }}>
                <Toggle id="set-cards-throttle" checked={c.throttle} onChange={(v) => A.setSetting('cards.throttle', v)}>
                  {t('fc.throttle')}
                </Toggle>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

const deckDom = (id: string) => `dk-${id.replace(/[^A-Za-z0-9_-]/g, '_')}`;
/** Adds a deck and puts the cursor in its name field. */
function addDeckAndFocus() {
  const id = A.addDeck();
  setTimeout(() => document.getElementById(`${deckDom(id)}-name`)?.focus(), 60);
}

function DeckList() {
  const { data, i18n } = useCtx();
  const { t } = i18n;
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <>
      <div className="deck-list">
        {data.decks.length ? (
          data.decks.map((d, i) => <DeckRow key={d.id} d={d} k={i + 1} confirm={confirm === d.id} setConfirm={setConfirm} />)
        ) : (
          <p className="small muted">{t('deck.none')}</p>
        )}
      </div>
      {data.decks.length < MAX_DECKS && (
        <div className="row-actions">
          <button className="btn soft" onClick={addDeckAndFocus}>
            {t('deck.add')}
          </button>
        </div>
      )}
      {data.decks.length > 0 && <Html as="p" className="small muted" html={t('deck.help')} />}
    </>
  );
}

function DeckRow({ d, k, confirm, setConfirm }: { d: Deck; k: number; confirm: boolean; setConfirm: (id: string | null) => void }) {
  const { data, plan, i18n } = useCtx();
  const { t } = i18n;
  const id = deckDom(d.id);
  const e = examById(data, d.exam);
  const auto = e && isISO(e.date) && num(d.cards) > 0 ? deckPerDay(d, { ...e, dn: dn(e.date) }, plan.start) : null;
  const up = (patch: Partial<Deck>) => A.updateDeck(d.id, patch);
  const label = deckLabel(d, data, t);
  return (
    <div className="deck-row" style={av(e ? e.color : 'grey')}>
      <span className="dot lg" />
      <Fld id={`${id}-name`} label={t('deck.name')} className="f-name">
        <CommitInput id={`${id}-name`} value={d.name} maxLength={60} placeholder={t('deck.namePh', k)} onCommit={(v) => up({ name: v.trim() })} />
      </Fld>
      <Fld id={`${id}-exam`} label={t('deck.exam')} className="f-exam">
        <select id={`${id}-exam`} value={d.exam} onChange={(ev) => up({ exam: ev.target.value })}>
          <option value="">{t('deck.noExam')}</option>
          {data.exams.map((x, i) => (
            <option key={x.id} value={x.id}>
              {exFull(x, t) || t('ex.namePh', i + 1)}
            </option>
          ))}
        </select>
      </Fld>
      <Fld id={`${id}-cards`} label={t('deck.cards')} className="f-cards">
        <CommitInput id={`${id}-cards`} type="number" min={0} step={10} value={d.cards || ''} placeholder="0" onCommit={(v) => up({ cards: Math.max(0, Math.round(numOr(v))) })} />
      </Fld>
      <Fld id={`${id}-new`} label={t('deck.newPerDay')} className="f-new">
        <CommitInput
          id={`${id}-new`}
          type="number"
          min={0}
          step={1}
          value={num(d.newPerDay) > 0 ? d.newPerDay : ''}
          placeholder={auto != null ? `${t('ex.auto')} ${auto}` : e ? t('ex.auto') : '0'}
          onCommit={(v) => up({ newPerDay: Math.max(0, Math.round(numOr(v))) })}
        />
      </Fld>
      <Fld id={`${id}-rev`} label={t('deck.reviews')} className="f-rev">
        <CommitInput id={`${id}-rev`} type="number" min={0} max={2000} step={1} value={d.due || ''} placeholder="0" onCommit={(v) => up({ due: Math.min(2000, Math.max(0, Math.round(numOr(v)))) })} />
      </Fld>
      <button className="iconbtn del" onClick={() => setConfirm(d.id)} aria-label={t('deck.remove', label)}>
        ×
      </button>
      {confirm && (
        <Confirm
          q={t('deck.removeQ', label)}
          yes={t('ex.removeYes')}
          onYes={() => {
            setConfirm(null);
            A.deleteDeck(d.id);
          }}
          onNo={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function CardsSection() {
  const { i18n } = useCtx();
  const { t } = i18n;
  return (
    <Fold id="sec-cards" color="sky" title={t('fc.title')} hint={t('fold.cards')}>
      <p className="sub">{t('fc.sub')}</p>
      <CardsFields />
    </Fold>
  );
}

// ---------------------------------------------------------------- reminders (iOS app only)
type RemKey = 'morning' | 'before' | 'evening' | 'exam';

function RemindersSection() {
  const { data, i18n } = useCtx();
  const { t } = i18n;
  const r = data.settings.reminders;
  const [perm, setPerm] = useState<NotifState | ''>('');
  useEffect(() => {
    notificationsState().then(setPerm, () => setPerm(''));
  }, []);
  const toggle = (k: RemKey, on: boolean) => {
    A.setSetting(`reminders.${k}`, on);
    if (on) void askNotifications().then((ok) => setPerm(ok ? 'granted' : 'denied'), () => undefined);
  };
  const anyOn = r.morning || r.before || r.evening || r.exam;
  const item = (k: RemKey, label: string, on: string, field: ReactNode, hint?: string) => (
    <div className="rem-item">
      <span className="lbl">{label}</span>
      <Toggle id={`set-rem-${k}`} checked={r[k]} onChange={(v) => toggle(k, v)}>
        {on}
      </Toggle>
      <div className="fgrid">{field}</div>
      {hint && <p className="small muted" style={{ margin: 0 }}>{hint}</p>}
    </div>
  );
  return (
    <Fold id="sec-reminders" color="butter" title={t('rem.title')} hint={t('fold.reminders')}>
      <p className="sub">{t('rem.sub')}</p>
      {anyOn && perm === 'denied' && (
        <div className="notes" style={{ margin: '0 0 6px' }}>
          <Box kind="achtung" label={t('rem.offLabel')}>
            <p>{t('rem.off')}</p>
          </Box>
        </div>
      )}
      <div className="rem-grid">
        {item('morning', t('rem.morning'), t('rem.morningOn'), <TimeSet path="reminders.morningAt" label={t('rem.at')} />)}
        {item('before', t('rem.before'), t('rem.beforeOn'), <NumSet path="reminders.beforeMin" label={t('rem.beforeMin')} min={0} max={60} step={5} />)}
        {item('evening', t('rem.evening'), t('rem.eveningOn'), <TimeSet path="reminders.eveningAt" label={t('rem.at')} />)}
        {item('exam', t('rem.exam'), t('rem.examOn'), <NumSet path="reminders.examDays" label={t('rem.examDays')} min={1} max={14} step={1} />, t('rem.examHint'))}
      </div>
    </Fold>
  );
}

// ---------------------------------------------------------------- preferences
export function LangRegion() {
  const { data, i18n } = useCtx();
  const { t } = i18n;
  const st = data.settings;
  return (
    <div className="fgrid">
      <Fld id="set-lang" label={t('pref.lang')}>
        <select id="set-lang" value={st.lang} onChange={(ev) => A.setSetting('lang', ev.target.value)}>
          <option value="auto">{t('pref.auto')}</option>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
        </select>
      </Fld>
      <Fld id="set-region" label={t('pref.region')}>
        <select id="set-region" value={st.region} onChange={(ev) => A.setSetting('region', ev.target.value)}>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {t(`region.${r}` as 'region.AT')}
            </option>
          ))}
        </select>
      </Fld>
    </div>
  );
}

function PrefsSection() {
  const { data, i18n } = useCtx();
  const { t } = i18n;
  const st = data.settings;
  return (
    <Fold id="sec-prefs" color="peach" title={t('pref.title')} hint={t('fold.prefs')}>
      <LangRegion />
      <p className="small muted" style={{ margin: '8px 0 0' }}>
        {t('pref.regionHelp')}
      </p>
      <div className="fgrid" style={{ marginTop: 12 }}>
        <Fld id="set-theme" label={t('pref.theme')}>
          <select id="set-theme" value={st.theme} onChange={(ev) => A.setSetting('theme', ev.target.value)}>
            <option value="auto">{t('theme.auto')}</option>
            <option value="light">{t('theme.light')}</option>
            <option value="dark">{t('theme.dark')}</option>
          </select>
        </Fld>
        <Fld id="set-termName" label={t('pref.termName')}>
          <CommitInput id="set-termName" value={st.termName} maxLength={60} placeholder={t('pref.termNamePh')} onCommit={(v) => A.setSetting('termName', v.trim())} />
        </Fld>
      </div>
    </Fold>
  );
}

