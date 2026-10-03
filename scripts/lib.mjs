// Shared helpers for the image scripts (store-shots, flyer, bmc-banner): a browser, the built app served locally,
// and the Pastell design's fonts and colour tokens for pages drawn from scratch.
// Needs a Chromium; set CHROMIUM=/path/to/chrome if it isn't at /opt/pw-browsers/chromium (Claude Code cloud).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

export const root = join(import.meta.dirname, '..');

/** A Chromium whose language is `locale`; date and time fields follow it (from the environment), not the page. */
export function launch(locale = 'de-AT') {
  const posix = locale.replace('-', '_') + '.UTF-8';
  return chromium.launch({
    executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium',
    args: [`--lang=${locale}`],
    env: { ...process.env, LANG: posix, LC_ALL: posix, LANGUAGE: locale.replace('-', '_') },
  });
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };

/** Serves dist/ (run `bun run build` first) on a free local port. Returns its address and a way to stop it. */
export async function serveDist() {
  const dist = join(root, 'dist');
  const server = createServer(async (req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    try {
      const body = await readFile(join(dist, p.endsWith('/') ? p + 'index.html' : p));
      res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'text/html' }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { base: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() };
}

/**
 * CSS for pages drawn from scratch: the self-hosted fonts and the light-mode colour tokens, read from the app's own
 * stylesheet so flyer and banner can never drift from the app. Such pages must be opened as files (page.goto with a
 * file URL), because a page set with setContent may not load local font files.
 */
export async function pastelCss() {
  const font = (f) => pathToFileURL(join(root, 'public', 'fonts', f)).href;
  const css = await readFile(join(root, 'src', 'styles', 'legacy.css'), 'utf8');
  const tokens = css.slice(css.indexOf(':root{'), css.indexOf('}', css.indexOf(':root{')) + 1);
  return `@font-face{font-family:'Source Sans 3';src:url(${font('SourceSans3.ttf')});font-weight:200 900}
@font-face{font-family:'Nunito Sans';src:url(${font('NunitoSans.ttf')});font-weight:200 1000}
@font-face{font-family:'Poppins';src:url(${font('Poppins-Medium.ttf')});font-weight:500}
${tokens}`;
}

/** Makes a page render the app in "iOS mode" (Capacitor custom platform), so app-only parts show as on the iPhone. */
export const asIosApp = (ctx) =>
  ctx.addInitScript(() => {
    window.CapacitorCustomPlatform = { name: 'ios', plugins: {} };
  });
