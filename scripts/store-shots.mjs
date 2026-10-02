// App Store screenshots: the real app (example plan) in iPhone and iPad sizes, German and English, framed with a
// caption in the Pastell design.  Output: store/screenshots/<iphone|ipad>/<de|en>/NN-name.jpg
//
//   bun run build && npm i --no-save playwright-core && node scripts/store-shots.mjs
//
// Needs a Chromium; set CHROMIUM=/path/to/chrome if it isn't at /opt/pw-browsers/chromium (Claude Code cloud).
// The app runs in "iOS mode" (Capacitor custom platform with the plugins' web fallbacks), so app-only parts such as
// Setup → Reminders appear exactly as on the iPhone. Clock and time zone are fixed, so the plan is the same each run.
import { createServer } from 'node:http';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const root = join(import.meta.dirname, '..');
const dist = join(root, 'dist');
const out = join(root, 'store', 'screenshots');
const NOW = new Date('2026-10-05T07:40:00+02:00'); // a Monday morning in Vienna

const DEVICES = {
  iphone: { viewport: { width: 440, height: 956 }, scale: 3, size: [1320, 2868], screenW: 1060, screenTop: 700, radius: 150, bezel: 26, type: 1320 },
  ipad: { viewport: { width: 1032, height: 1376 }, scale: 2, size: [2064, 2752], screenW: 1500, screenTop: 720, radius: 70, bezel: 30, type: 1500 },
};

const TEXT = {
  de: {
    locale: 'de-AT',
    plan: 'Medizin · WS 2026/27',
    example: 'Zuerst ein Beispiel ansehen',
    tabs: ['Heute', 'Woche', 'Jahr', 'Einstellungen'],
    now: 'jetzt',
    note: ['PM IV · Vertiefungsblock in 10 min', '14:00–15:30 · 1 h 30'],
    shots: [
      ['today', 'Dein Tag, rund um deine Lehrveranstaltungen geplant', 'Lernblöcke in deiner freien Zeit, Karteikarten inklusive.'],
      ['week', 'Die ganze Woche auf einen Blick', 'Lehrveranstaltungen, Lernblöcke und Karteikarten in einem Raster.'],
      ['year', 'Jede Prüfung im Blick', 'Vorbereitungszeit, Stunden und Status, automatisch berechnet.'],
      ['reminders', 'Erinnerungen, die mitdenken', 'Morgenüberblick, vor jedem Block, vor Prüfungen: du wählst.'],
      ['privacy', 'Deine Daten bleiben bei dir', 'Kein Konto, kein Tracking. Alles bleibt auf deinem {device}.'],
      ['dark', 'Hell oder dunkel, auch offline', 'Ändert sich deine Woche, zieht der Plan mit.'],
    ],
  },
  en: {
    locale: 'en-GB',
    plan: 'Medicine · Winter term',
    example: 'Explore an example first',
    tabs: ['Today', 'Week', 'Year', 'Setup'],
    now: 'now',
    note: ['PM IV · deep block in 10 min', '14:00–15:30 · 1 h 30'],
    shots: [
      ['today', 'Your day, planned around your classes', 'Study blocks in your free time, flashcards included.'],
      ['week', 'Your whole week at a glance', 'Classes, study blocks and flashcards in one grid.'],
      ['year', 'Every exam on track', 'Prep time, hours and status, worked out for you.'],
      ['reminders', 'Reminders that follow your plan', 'Morning overview, before each block, before exams: you choose.'],
      ['privacy', 'Your data stays with you', 'No account, no tracking. Everything stays on your {device}.'],
      ['dark', 'Light or dark, even offline', 'When your week changes, the plan moves with it.'],
    ],
  },
};

// ---------------------------------------------------------------- a tiny static server for dist/
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    const body = await readFile(join(dist, p.endsWith('/') ? p + 'index.html' : p));
    res.writeHead(200, { 'content-type': types[extname(p)] || 'text/html' }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const fonts = await readdir(join(dist, 'assets'));
const font = (prefix) => base + 'assets/' + fonts.find((f) => f.startsWith(prefix) && f.endsWith('.ttf'));

// Date and time fields follow the browser's own language (from the environment), so each language gets its own browser.
const launch = (locale) => {
  const posix = locale.replace('-', '_') + '.UTF-8';
  return chromium.launch({
    executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium',
    args: [`--lang=${locale}`],
    env: { ...process.env, LANG: posix, LC_ALL: posix, LANGUAGE: locale.replace('-', '_') },
  });
};
let browser;

// ---------------------------------------------------------------- 1. screens of the app
async function appScreens(dev, lang) {
  const d = DEVICES[dev], L = TEXT[lang];
  const shots = {};
  for (const dark of [false, true]) {
    const ctx = await browser.newContext({ viewport: d.viewport, deviceScaleFactor: d.scale, locale: L.locale, timezoneId: 'Europe/Vienna', colorScheme: dark ? 'dark' : 'light', permissions: ['notifications'], isMobile: dev === 'iphone', hasTouch: true });
    await ctx.clock.setFixedTime(NOW);
    await ctx.addInitScript(() => {
      window.CapacitorCustomPlatform = { name: 'ios', plugins: {} };
    });
    const pg = await ctx.newPage();
    await pg.goto(base);
    await pg.getByRole('button', { name: L.example }).click();
    await pg.addStyleTag({ content: '.ex-banner{display:none!important}' });
    // a realistic plan name instead of "example plan"
    await pg.getByRole('tab', { name: L.tabs[3] }).click();
    const name = pg.locator('#set-termName');
    await name.fill(L.plan);
    await name.press('Enter');
    const snap = async (key) => {
      await pg.waitForTimeout(350);
      shots[key] = await pg.screenshot();
    };
    const scrollTo = (sel, off) => pg.evaluate(([s, o]) => scrollTo(0, Math.max(0, document.querySelector(s).getBoundingClientRect().top + scrollY - o)), [sel, off]);
    if (dark) {
      await pg.getByRole('tab', { name: L.tabs[0] }).click();
      await scrollTo('.today', dev === 'iphone' ? 70 : 90);
      await snap('dark');
    } else {
      await pg.getByRole('tab', { name: L.tabs[0] }).click();
      await pg.evaluate(() => scrollTo(0, 0));
      await snap('today');
      await pg.getByRole('tab', { name: L.tabs[1] }).click();
      await scrollTo('.card.week', 70);
      await snap('week');
      await pg.getByRole('tab', { name: L.tabs[2] }).click();
      await scrollTo('#view .card', 70);
      await snap('year');
      await pg.getByRole('tab', { name: L.tabs[3] }).click();
      for (const k of ['morning', 'before', 'exam']) await pg.locator(`#set-rem-${k}`).check({ force: true });
      await scrollTo('#sec-reminders', dev === 'iphone' ? 120 : 205); // room for the notification banner on top
      await snap('reminders');
      await scrollTo('#sec-data', 70);
      await snap('privacy');
    }
    await ctx.close();
  }
  return shots;
}

// ---------------------------------------------------------------- 2. framed, captioned store images
let page;
async function compose(dev, lang, key, title, sub, png) {
  const d = DEVICES[dev], L = TEXT[lang];
  const [W, H] = d.size;
  const T = d.type; // base for text sizes: the iPad gets bigger type than the iPhone, but not in proportion to its width
  const dark = key === 'dark';
  const c = dark
    ? { page: '#151821', ink: '#f3f4f8', soft: '#a5abbb', kick: '#8c93a6', b1: '#261f3e', b2: '#321f2c', b3: '#1b2e26', bezel: '#2a2f3d' }
    : { page: '#f7f6fb', ink: '#2e3240', soft: '#6e7483', kick: '#a3a8b5', b1: '#e9e1fd', b2: '#fde0ea', b3: '#d9f2e6', bezel: '#2e3240' };
  const sh = d.screenW * (d.viewport.height / d.viewport.width);
  const noteW = Math.max(T * 0.8, d.screenW - 48); // across the whole screen, so nothing peeks out beside it
  const note =
    key === 'reminders'
      ? `<div class="note"><div class="ic"></div><div class="nt"><div class="nh"><b>SEMESTRA</b><span>${L.now}</span></div><b>${L.note[0]}</b><span>${L.note[1]}</span></div></div>`
      : '';
  await page.setViewportSize({ width: W, height: H });
  await page.goto(base + 'fonts/OFL.txt'); // same origin as the font files, so they may load
  await page.setContent(`<!doctype html><html><head><style>
    @font-face{font-family:Head;src:url(${font('NunitoSans')})}
    @font-face{font-family:Body;src:url(${font('SourceSans3')})}
    @font-face{font-family:Kick;src:url(${font('Poppins-Medium')});font-weight:500}
    *{margin:0;box-sizing:border-box}
    body{width:${W}px;height:${H}px;overflow:hidden;position:relative;background:${c.page};
      background-image:radial-gradient(circle at 12% 6%,${c.b1} 0,transparent 42%),radial-gradient(circle at 92% 14%,${c.b2} 0,transparent 40%),radial-gradient(circle at 30% 98%,${c.b3} 0,transparent 45%)}
    .cap{position:absolute;left:${(W - T * 0.84) / 2}px;right:${(W - T * 0.84) / 2}px;top:${d.screenTop * 0.2}px;text-align:center}
    .k{font:500 ${T * 0.026}px/1 Kick;letter-spacing:.2em;color:${c.kick};text-transform:uppercase}
    h1{margin-top:${T * 0.028}px;font:300 ${T * 0.072}px/1.08 Head;letter-spacing:-.015em;color:${c.ink};text-wrap:balance}
    p{margin-top:${T * 0.024}px;font:400 ${T * 0.034}px/1.35 Body;color:${c.soft};text-wrap:balance}
    .phone{position:absolute;left:${(W - d.screenW) / 2 - d.bezel}px;top:${d.screenTop - d.bezel}px;width:${d.screenW + 2 * d.bezel}px;height:${sh + 2 * d.bezel}px;
      padding:${d.bezel}px;border-radius:${d.radius + d.bezel}px;background:${c.bezel};box-shadow:0 40px 120px rgba(40,30,90,.28)}
    .phone img{display:block;width:${d.screenW}px;height:${sh}px;border-radius:${d.radius}px}
    .note{position:absolute;left:${(W - noteW) / 2}px;right:${(W - noteW) / 2}px;top:${d.screenTop + T * 0.03}px;display:flex;gap:${T * 0.022}px;align-items:center;
      padding:${T * 0.026}px ${T * 0.03}px;border-radius:${T * 0.04}px;background:#faf9fd;box-shadow:0 24px 70px rgba(40,30,90,.25)}
    .ic{flex:none;width:${T * 0.075}px;height:${T * 0.075}px;border-radius:22%;background:url(${base}icons/icon-192.png) center/cover}
    .nt{display:grid;gap:${T * 0.004}px;font:400 ${T * 0.03}px/1.25 Body;color:#2e3240;min-width:0}
    .nt b{font-weight:700}.nh{display:flex;justify-content:space-between;font-size:${T * 0.022}px;color:#6e7483;letter-spacing:.06em}
    .nh b{font-weight:600}.nt span{color:#4a4f5c}
  </style></head><body>
    <div class="cap"><div class="k">Semestra</div><h1>${title}</h1><p>${sub.replace('{device}', dev === 'ipad' ? 'iPad' : 'iPhone')}</p></div>
    <div class="phone"><img src="data:image/png;base64,${png.toString('base64')}"></div>${note}
  </body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  // App Store screenshots must be RGB without transparency
  return sharp(await page.screenshot()).flatten({ background: c.page }).jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer();
}

for (const dev of Object.keys(DEVICES)) {
  for (const lang of Object.keys(TEXT)) {
    browser = await launch(TEXT[lang].locale);
    page = await browser.newPage();
    const shots = await appScreens(dev, lang);
    const dir = join(out, dev, lang);
    await mkdir(dir, { recursive: true });
    for (const [i, [key, title, sub]] of TEXT[lang].shots.entries()) {
      const img = await compose(dev, lang, key, title, sub, shots[key]);
      await sharp(img).toFile(join(dir, `${String(i + 1).padStart(2, '0')}-${key}.jpg`));
    }
    console.log(`${dev}/${lang}: ${TEXT[lang].shots.length} screenshots`);
    await browser.close();
  }
}
server.close();
