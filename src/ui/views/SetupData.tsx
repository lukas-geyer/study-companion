import { useRef, useState } from 'react';
import { APP_ID, APP_NAME } from '../../config';
import { fromBackup, toBackup } from '../../core/backup';
import { isoOf } from '../../core/dates';
import { GLYPH } from '../../core/defaults';
import { planToICS } from '../../core/icsExport';
import type { AppData } from '../../core/types';
import * as A from '../../state/actions';
import { setUI, toast } from '../../state/store';
import { useCtx } from '../ctx';
import { av, Toggle } from '../parts/common';
import { modTip, modTitle } from '../parts/labels';

type SaveNs = { save(r: { filename: string; data: string }): Promise<unknown> } | null;
type ClaudeWin = { claude?: { use?: (n: string) => Promise<unknown> } };

/** Save a generated file: through the Claude viewer's download prompt when running there, else a normal download. */
export async function download(filename: string, text: string, type: string): Promise<'saved' | 'declined' | 'unsupported' | 'failed'> {
  const w = window as unknown as ClaudeWin;
  if (w.claude?.use && window.top !== window.self) {
    try {
      const dl = (await w.claude.use('downloads')) as SaveNs;
      if (dl) {
        await dl.save({ filename, data: text });
        return 'saved';
      }
    } catch (e) {
      const code = (e as { code?: string })?.code;
      return code === 'declined' ? 'declined' : code === 'rejected_extension' || code === 'unavailable' ? 'unsupported' : 'failed';
    }
  }
  try {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return 'saved';
  } catch {
    return 'failed';
  }
}

const report = (r: Awaited<ReturnType<typeof download>>, ok: 'toast.backedUp' | 'toast.exported') => {
  if (r === 'saved') toast(ok);
  else if (r === 'unsupported') toast('toast.previewOnly');
  else if (r === 'failed') toast('toast.saveFailed');
};

type Confirm = null | 'reset' | 'wipe' | { k: 'restore'; data: AppData };

export function DataSection() {
  const { data, ui, plan, T, i18n } = useCtx();
  const { t } = i18n;
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [withCards, setWithCards] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const storeName = ui.storage === 'idb' ? t('store.idb') : ui.storage === 'local' ? t('store.local') : ui.storage === 'memory' ? t('store.memory') : '…';

  const backup = () => {
    void download(`${APP_ID}-backup-${isoOf(T)}.json`, toBackup(data), 'application/json').then((r) => report(r, 'toast.backedUp'));
  };
  const onRestoreFile = async (fl: File | undefined) => {
    if (!fl) return;
    try {
      setConfirm({ k: 'restore', data: fromBackup(await fl.text()) });
    } catch {
      toast('toast.badBackup');
    }
  };
  const exportIcs = () => {
    const text = planToICS(plan, {
      from: T,
      to: T + 56,
      includeCards: withCards,
      calendarName: data.settings.termName || APP_NAME,
      title: (m) => `${GLYPH[m.type] || ''} ${modTitle(m, data, t)}`.trim(),
      description: (m) => {
        const [lead, tip] = modTip(m, Math.round(Date.parse(m.d) / 864e5), data, plan, t);
        return `${lead ? lead + ' ' : ''}${tip}`;
      },
    });
    void download(`${APP_ID}-${isoOf(T)}.ics`, text, 'text/calendar').then((r) => report(r, 'toast.exported'));
  };

  const confirmBox = (q: string, yes: string, onYes: () => void) => (
    <div className="confirm">
      <span>{q}</span>
      <span className="row-actions" style={{ margin: 0 }}>
        <button className="btn warn sm" onClick={onYes}>
          {yes}
        </button>
        <button className="btn soft sm" onClick={() => setConfirm(null)}>
          {t('keep')}
        </button>
      </span>
    </div>
  );

  return (
    <section className="card" id="sec-data" style={av('lilac')}>
      <h2 className="h2">{t('data.title')}</h2>
      <p className="sub">{t('data.sub')}</p>
      <div className="row-actions" style={{ marginTop: 0 }}>
        <button className="btn soft" onClick={backup}>
          {t('data.backup')}
        </button>
        <button
          className="btn soft"
          onClick={() => {
            if (file.current) {
              file.current.value = '';
              file.current.click();
            }
          }}
        >
          {t('data.restore')}
        </button>
        <input ref={file} type="file" accept=".json,application/json" hidden onChange={(ev) => onRestoreFile(ev.target.files?.[0])} />
      </div>
      {confirm && typeof confirm === 'object' && (
        <div style={{ marginTop: 10 }}>
          {confirmBox(t('data.restoreQ'), t('data.restoreYes'), () => {
            A.restoreData(confirm.data);
            setConfirm(null);
            toast('toast.restored');
          })}
        </div>
      )}
      <p className="small muted" style={{ margin: '10px 0 0' }}>
        {t('data.storage', storeName)}
      </p>

      <div className="grp">
        <span className="lbl">{t('data.export')}</span>
        <p className="small muted" style={{ margin: '0 0 10px' }}>
          {t('data.exportHelp')}
        </p>
        {data.settings.cards.on && (
          <Toggle id="exp-cards" checked={withCards} onChange={setWithCards}>
            {t('data.exportCards')}
          </Toggle>
        )}
        <div className="row-actions">
          <button className="btn soft" onClick={exportIcs}>
            {t('data.exportBtn')}
          </button>
        </div>
      </div>

      <div className="grp">
        <div className="row-actions" style={{ marginTop: 0 }}>
          {data.meta.example ? (
            <button className="btn" onClick={() => A.startFresh()}>
              {t('banner.exampleCta')}
            </button>
          ) : (
            <button className="btn soft" onClick={() => setUI({ wizard: true })}>
              {t('data.wizard')}
            </button>
          )}
        </div>
      </div>

      <div className="grp">
        <span className="lbl">{t('data.reset')}</span>
        <p className="small muted" style={{ margin: '0 0 10px' }}>
          {t('data.resetHelp')}
        </p>
        {confirm === 'reset' ? (
          confirmBox(t('data.resetQ'), t('data.resetYes'), () => {
            A.resetSettings();
            setConfirm(null);
            toast('toast.reset');
          })
        ) : (
          <button className="btn soft" onClick={() => setConfirm('reset')}>
            {t('data.reset')}
          </button>
        )}
      </div>

      <div className="grp">
        <span className="lbl">{t('data.wipe')}</span>
        <p className="small muted" style={{ margin: '0 0 10px' }}>
          {t('data.wipeHelp')}
        </p>
        {confirm === 'wipe' ? (
          confirmBox(t('data.wipeQ'), t('data.wipeYes'), () => {
            setConfirm(null);
            void A.wipeAll().then(() => toast('toast.wiped'));
          })
        ) : (
          <button className="btn soft" onClick={() => setConfirm('wipe')}>
            {t('data.wipe')}
          </button>
        )}
      </div>
    </section>
  );
}
