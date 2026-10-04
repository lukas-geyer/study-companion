// The website's front page around the welcome card (Onboarding step 0, web only; the iOS app keeps just the card):
// a preview of a planned day next to the welcome text, then what Semestra does, how it works, privacy and a last
// call to action. All of it is drawn from the Pastell tokens; the preview is illustration only (aria-hidden).
import { APP_NAME } from '../config';
import { dowOf, hm, kwOf } from '../core/dates';
import type { PaletteKey } from '../core/types';
import { useCtx } from './ctx';
import { LegalLink } from './Legal';
import { av } from './parts/common';

/** A small, static picture of a planned day in the app's own style. */
export function HeroPreview() {
  const { T, i18n } = useCtx();
  const { t, f } = i18n;
  let n = T; // a weekday, so the lecture in the picture makes sense
  while (dowOf(n) === 0 || dowOf(n) === 6) n++;
  const rows: { s: number; e: number; label: string; kind: 'cls' | 'soft' | 'blk'; ico?: string; c?: PaletteKey }[] = [
    { s: 495, e: 720, label: t('land.lecture'), kind: 'cls' },
    { s: 720, e: 765, label: t('meal.0'), kind: 'soft' },
    { s: 765, e: 810, label: t('mod.rev'), kind: 'blk', ico: '↻', c: 'sky' },
    { s: 825, e: 915, label: `PM IV · ${t('type.deep')}`, kind: 'blk', ico: '◆', c: 'lav' },
    { s: 930, e: 975, label: `HISTO · ${t('type.focus')}`, kind: 'blk', ico: '◇', c: 'butter' },
  ];
  return (
    <div className="pv" aria-hidden="true">
      <div className="pv-card">
        <div className="kicker">{n === T ? `${t('kw', kwOf(n))} · ${t('rel.today')}` : t('kw', kwOf(n))}</div>
        <div className="pv-title">{f.long(n)}</div>
        <div className="pills">
          <span className="pill">{t('land.lecture')}</span>
          <span className="pill" style={av('lav')}>
            {t('pill.study', f.dur(195))}
          </span>
        </div>
        <ul className="pv-list">
          {rows.map((r) => (
            <li key={r.s} className={`pv-row pv-${r.kind}`} style={r.c ? av(r.c) : undefined}>
              <span className="pv-t">{hm(r.s)}</span>
              <span className="pv-b">
                {r.ico && <i>{r.ico}</i>}
                {r.label}
                {r.kind !== 'soft' && <small>{f.dur(r.e - r.s)}</small>}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="pv-exam" style={av('lav')}>
        <span className="dot" />
        <b>PM IV</b>
        <span className="spill ok">{t('status.ok')}</span>
      </div>
    </div>
  );
}

const FEATURES: [PaletteKey, string, 1 | 2 | 3 | 4][] = [
  ['lav', '◆', 1],
  ['sky', '↻', 2],
  ['mint', '✓', 3],
  ['rose', '↺', 4],
];

/** Everything below the welcome card: features, three steps, privacy, and the call to action again. */
export function LandingSections({ onStart, onExample }: { onStart: () => void; onExample: () => void }) {
  const { t } = useCtx().i18n;
  return (
    <div className="land">
      <section className="land-sec">
        <div className="kicker">{t('land.featKicker')}</div>
        <h2 className="h2">{t('land.featTitle')}</h2>
        <div className="land-grid">
          {FEATURES.map(([c, ico, k]) => (
            <div key={k} className="card land-feat" style={av(c)}>
              <span className="land-ico">{ico}</span>
              <h3 className="land-h">{t(`land.f${k}` as 'land.f1')}</h3>
              <p>{t(`land.f${k}b` as 'land.f1b')}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="land-sec">
        <div className="kicker">{t('land.howKicker')}</div>
        <h2 className="h2">{t('land.howTitle')}</h2>
        <ol className="land-steps">
          {([1, 2, 3] as const).map((k) => (
            <li key={k} className="card">
              <span className="land-num">{k}</span>
              <h3 className="land-h">{t(`land.s${k}` as 'land.s1')}</h3>
              <p>{t(`land.s${k}b` as 'land.s1b')}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="land-sec land-two">
        <div className="card" style={av('mint')}>
          <h2 className="h2">{t('land.privTitle')}</h2>
          <p className="sub">{t('pv.short', APP_NAME)}</p>
          <div className="pills">
            {(['p1', 'p2', 'p3', 'p4'] as const).map((k) => (
              <span key={k} className="pill" style={av('mint')}>
                ✓ {t(`land.${k}`)}
              </span>
            ))}
          </div>
          <p className="small muted land-more">
            <LegalLink doc="privacy">{t('pv.title')}</LegalLink>
          </p>
        </div>
        <div className="card land-cta">
          <h2 className="h2">{t('land.ctaTitle')}</h2>
          <p className="sub">{t('land.ctaBody')}</p>
          <div className="row-actions">
            <button className="btn" onClick={onStart}>
              {t('ob.start')}
            </button>
            <button className="btn soft" onClick={onExample}>
              {t('ob.example')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
