// Imprint and privacy notice: the footer links and the texts shown in the legal pane (Panes.tsx).
// The privacy notice must match what the app and its host really do with data. Update it, and
// 'legal.updated', whenever that changes (a network request, a new kind of stored data, other hosting).
import { Fragment, type MouseEvent, type ReactNode } from 'react';
import { APP_NAME, APP_VERSION, IMPRINT, SUPPORT_URL } from '../config';
import type { T } from '../i18n';
import { isNative } from '../native';
import { setUI, type LegalDoc } from '../state/store';
import { useCtx } from './ctx';
import { Box } from './parts/common';

const GITHUB_PRIVACY = 'https://docs.github.com/site-policy/privacy-policies/github-privacy-statement';
const DSB = 'https://www.dsb.gv.at';

/** A real #imprint / #privacy link: opens the pane here, and still works in a new tab. */
export function LegalLink({ doc, children }: { doc: LegalDoc; children: ReactNode }) {
  const open = (ev: MouseEvent<HTMLAnchorElement>) => {
    if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    ev.preventDefault();
    setUI({ pane: { k: 'legal', doc } });
  };
  return (
    <a className="legal-link" href={`#${doc}`} onClick={open}>
      {children}
    </a>
  );
}

/** Footer links. `support` adds the donation link – on the website only, never in the iOS app. */
export function LegalLinks({ support = false }: { support?: boolean }) {
  const { t } = useCtx().i18n;
  return (
    <nav className="foot legal-links" aria-label={t('legal.links')}>
      <LegalLink doc="imprint">{t('legal.imprint')}</LegalLink>
      <span aria-hidden="true"> · </span>
      <LegalLink doc="privacy">{t('legal.privacy')}</LegalLink>
      {support && !isNative && (
        <>
          <span aria-hidden="true"> · </span>
          <a className="legal-link" href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
            {t('legal.support')} ☕
          </a>
        </>
      )}
    </nav>
  );
}

const Ext = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);
const Mail = () => (IMPRINT.email ? <a href={`mailto:${IMPRINT.email}`}>{IMPRINT.email}</a> : <>…</>);

export function LegalText({ doc }: { doc: LegalDoc }) {
  const { t } = useCtx().i18n;
  return (
    <div className="legal" id="legal-doc" role="tabpanel">
      {doc === 'imprint' ? <Imprint t={t} /> : <Privacy t={t} />}
    </div>
  );
}

function Imprint({ t }: { t: T }) {
  return (
    <>
      <p className="small muted">{t('imp.law')}</p>
      <h4 className="lbl">{t('imp.owner')}</h4>
      <address>
        {IMPRINT.name || '…'}
        {IMPRINT.address.map((line) => (
          <Fragment key={line}>
            <br />
            {line}
          </Fragment>
        ))}
      </address>
      <h4 className="lbl">{t('imp.contact')}</h4>
      <p>
        <Mail />
      </p>
      <h4 className="lbl">{t('imp.fonts')}</h4>
      <p>
        {t('imp.fontsText')} <Ext href="./fonts/OFL.txt">SIL Open Font License 1.1</Ext>.
      </p>
      <p className="small muted">
        {APP_NAME} {APP_VERSION}
      </p>
    </>
  );
}

function Privacy({ t }: { t: T }) {
  const who = [IMPRINT.name || '…', ...IMPRINT.address].join(', ');
  return (
    <>
      <Box kind="praxis" label={t('pv.shortLabel')}>
        <p>{t('pv.short', APP_NAME)}</p>
      </Box>
      <h4 className="lbl">{t('pv.ctrlH')}</h4>
      <p>
        {t('pv.ctrl')} {who} · <Mail />
      </p>
      <h4 className="lbl">{t('pv.localH')}</h4>
      <p>{t('pv.local1')}</p>
      <p>{t('pv.local2')}</p>
      <p>{t('pv.local3')}</p>
      <p>{t('pv.local4', t('tabs.setup'), t('data.title'))}</p>
      <h4 className="lbl">{t('pv.noneH')}</h4>
      <p>{t('pv.none')}</p>
      <h4 className="lbl">{t('pv.hostH')}</h4>
      <p>{t('pv.host1', APP_NAME)}</p>
      <p>{t('pv.host2')}</p>
      <p>
        {t('pv.host3')} <Ext href={GITHUB_PRIVACY}>{t('pv.host3Link')}</Ext>.
      </p>
      <h4 className="lbl">{t('pv.appH')}</h4>
      <p>{t('pv.app')}</p>
      <h4 className="lbl">{t('pv.mailH')}</h4>
      <p>{t('pv.mail')}</p>
      <h4 className="lbl">{t('pv.supportH')}</h4>
      <p>{t('pv.support')}</p>
      <h4 className="lbl">{t('pv.rightsH')}</h4>
      <p>{t('pv.rights1')}</p>
      <p>
        {t('pv.rights2')} <Ext href={DSB}>dsb.gv.at</Ext>.
      </p>
      <p className="small muted">{t('legal.updated')}</p>
    </>
  );
}
