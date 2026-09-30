import { useEffect, useRef, useState } from 'react';
import { APP_NAME } from '../config';
import { fromBackup } from '../core/backup';
import { toast } from '../state/store';
import * as A from '../state/actions';
import { useCtx } from './ctx';
import { av, Fld, numOr, CommitInput, PickInput } from './parts/common';
import { CardsFields, ExamsSection, IcsImport, LangRegion, TemplateWeek } from './views/Setup';

const STEPS = 5;

export function Onboarding() {
  const { data, i18n } = useCtx();
  const { t } = i18n;
  const [step, setStep] = useState(0);
  const top = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    top.current?.scrollIntoView({ block: 'start' });
    const h = top.current?.querySelector<HTMLElement>('h2');
    h?.focus();
  }, [step]);
  const st = data.settings;
  const next = () => (step < STEPS ? setStep(step + 1) : A.finishOnboarding());
  const back = () => setStep(Math.max(0, step - 1));
  const nav = (
    <div className="ob-nav">
      {step > 0 ? (
        <button className="btn ghost" onClick={back}>
          ‹ {t('ob.back')}
        </button>
      ) : (
        <span />
      )}
      <button className="btn" onClick={next}>
        {step === STEPS ? t('ob.finish') : t('ob.next')}
      </button>
    </div>
  );
  return (
    <div className="ob" ref={top}>
      <div className="ob-card">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        {step === 0 ? (
          <div className="ob-body">
            <div className="kicker">
              {APP_NAME} · {t('ob.kicker')}
            </div>
            <h2 className="ob-h1" tabIndex={-1}>
              {t('ob.title')}
            </h2>
            <span className="rule" aria-hidden="true" />
            <p className="lede">{t('ob.lede')}</p>
            <div className="ob-prefs">
              <LangRegion />
            </div>
            <div className="row-actions ob-start">
              <button className="btn" onClick={() => setStep(1)}>
                {t('ob.start')}
              </button>
              <button className="btn soft" onClick={() => A.loadExample(i18n.lang, st.region)}>
                {t('ob.example')}
              </button>
              <button className="btn ghost" onClick={() => file.current?.click()}>
                {t('ob.restore')}
              </button>
              <input
                ref={file}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={async (ev) => {
                  const f = ev.target.files?.[0];
                  if (!f) return;
                  try {
                    A.restoreData(fromBackup(await f.text()));
                    toast('toast.restored');
                  } catch {
                    toast('toast.badBackup');
                  }
                }}
              />
            </div>
            <p className="small muted">{t('ob.private')}</p>
          </div>
        ) : (
          <div className="ob-body">
            <div className="ob-progress" aria-hidden="true">
              {Array.from({ length: STEPS }, (_, i) => (
                <i key={i} className={i < step ? 'on' : ''} />
              ))}
            </div>
            <div className="kicker">{t('ob.step', step, STEPS)}</div>
            {step === 1 && (
              <>
                <h2 className="h2" tabIndex={-1}>
                  {t('ob.examsTitle')}
                </h2>
                <p className="sub">{t('ob.examsSub')}</p>
                <div style={av('lav')}>
                  <ExamsSection compact />
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <h2 className="h2" tabIndex={-1}>
                  {t('ob.ttTitle')}
                </h2>
                <p className="sub">{t('ob.ttSub')}</p>
                <IcsImport />
                <p className="small muted" style={{ margin: '10px 0 14px' }}>
                  {t('tt.importHelp')}
                </p>
                <div className="grp">
                  <span className="lbl">{t('tt.template')}</span>
                  <TemplateWeek />
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <h2 className="h2" tabIndex={-1}>
                  {t('ob.dayTitle')}
                </h2>
                <p className="sub">{t('ob.daySub')}</p>
                <div className="fgrid">
                  <Fld id="ob-dayStart" label={t('rh.dayStart')}>
                    <PickInput id="ob-dayStart" type="time" value={st.dayStart} onCommit={(v) => A.setSetting('dayStart', v)} />
                  </Fld>
                  <Fld id="ob-dayEnd" label={t('rh.dayEnd')}>
                    <PickInput id="ob-dayEnd" type="time" value={st.dayEnd} onCommit={(v) => A.setSetting('dayEnd', v)} />
                  </Fld>
                  <Fld id="ob-weStart" label={t('rh.weStart')}>
                    <PickInput id="ob-weStart" type="time" value={st.weekendStart} onCommit={(v) => A.setSetting('weekendStart', v)} />
                  </Fld>
                  <Fld id="ob-weEnd" label={t('rh.weEnd')}>
                    <PickInput id="ob-weEnd" type="time" value={st.weekendEnd} onCommit={(v) => A.setSetting('weekendEnd', v)} />
                  </Fld>
                </div>
                <div className="fgrid" style={{ marginTop: 12 }}>
                  <Fld id="ob-capFree" label={t('ob.capFree')}>
                    <CommitInput id="ob-capFree" type="number" min={0} max={14} step={0.5} value={st.caps.free} onCommit={(v) => A.setSetting('caps.free', Math.min(14, Math.max(0, numOr(v, 6))))} />
                  </Fld>
                  <Fld id="ob-capSat" label={t('ob.capWeekend')}>
                    <CommitInput id="ob-capSat" type="number" min={0} max={14} step={0.5} value={st.caps.sat} onCommit={(v) => A.setSetting('caps.sat', Math.min(14, Math.max(0, numOr(v, 5))))} />
                  </Fld>
                  <Fld id="ob-capSun" label={t('ob.capSun')}>
                    <CommitInput id="ob-capSun" type="number" min={0} max={14} step={0.5} value={st.caps.sun} onCommit={(v) => A.setSetting('caps.sun', Math.min(14, Math.max(0, numOr(v, 3))))} />
                  </Fld>
                </div>
              </>
            )}
            {step === 4 && (
              <>
                <h2 className="h2" tabIndex={-1}>
                  {t('ob.cardsTitle')}
                </h2>
                <p className="sub">{t('ob.cardsSub')}</p>
                <CardsFields compact />
              </>
            )}
            {step === 5 && (
              <>
                <h2 className="h2" tabIndex={-1}>
                  {t('ob.doneTitle')}
                </h2>
                <p className="sub">{t('ob.doneSub')}</p>
                <p className="small muted">{t('ob.install')}</p>
              </>
            )}
            {nav}
          </div>
        )}
      </div>
    </div>
  );
}
