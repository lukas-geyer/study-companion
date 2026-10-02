// A4 flyer for university notice boards (German), in the Pastell design, with the real app on a phone, a QR code
// to semestra.at and tear-off strips.  Output: store/flyer/semestra-flyer-a4.pdf (print) and .png (preview).
//
//   bun run build && npm i --no-save playwright-core qrcode && node scripts/flyer.mjs
//
// Needs a Chromium; set CHROMIUM=/path/to/chrome if it isn't at /opt/pw-browsers/chromium (Claude Code cloud).
import { createServer } from 'node:http';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import QRCode from 'qrcode';

const root = join(import.meta.dirname, '..');
const dist = join(root, 'dist');
const out = join(root, 'store', 'flyer');
const URL_ = 'https://semestra.at';
await mkdir(out, { recursive: true });

// ---------------------------------------------------------------- the app screen (example plan, German, fixed date)
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    res.writeHead(200, { 'content-type': types[extname(p)] || 'text/html' }).end(await readFile(join(dist, p.endsWith('/') ? p + 'index.html' : p)));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const env = { ...process.env, LANG: 'de_AT.UTF-8', LC_ALL: 'de_AT.UTF-8', LANGUAGE: 'de_AT' };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--lang=de-AT'], env });

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'de-AT', timezoneId: 'Europe/Vienna', isMobile: true, hasTouch: true });
await ctx.clock.setFixedTime(new Date('2026-10-05T07:40:00+02:00'));
await ctx.addInitScript(() => {
  window.CapacitorCustomPlatform = { name: 'ios', plugins: {} };
});
const app = await ctx.newPage();
await app.goto(base);
await app.getByRole('button', { name: 'Zuerst ein Beispiel ansehen' }).click();
await app.addStyleTag({ content: '.ex-banner{display:none!important}' });
await app.getByRole('tab', { name: 'Einstellungen' }).click();
await app.locator('#set-termName').fill('Medizin · WS 2026/27');
await app.locator('#set-termName').press('Enter');
await app.getByRole('tab', { name: 'Heute' }).click();
await app.evaluate(() => scrollTo(0, 0));
await app.waitForTimeout(400);
await writeFile(join(out, 'screen.png'), await app.screenshot());
await ctx.close();
server.close();

// ---------------------------------------------------------------- the flyer
const qr = await QRCode.toString(URL_, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#2e3240', light: '#ffffff' } });
const fontUrl = (f) => pathToFileURL(join(root, 'public', 'fonts', f)).href;
const features = [
  ['lav', '◆', 'Lernblöcke zwischen deinen LVs', '90- und 45-Minuten-Blöcke in deinen freien Stunden, jeweils mit Pause.'],
  ['sky', '↻', 'Karteikarten inklusive', 'Jeden Tag Zeit für Anki-Wiederholungen und genau so viele neue Karten, wie du brauchst.'],
  ['mint', '✓', 'Jede Prüfung im Blick', 'Für jede Prüfung siehst du: im Plan, knapp oder zu wenig Zeit.'],
  ['rose', '↺', 'Plant von selbst neu', 'Krank, Termin, Ferien? Unerledigtes wandert automatisch auf die nächsten Tage.'],
];
const strips = Array.from({ length: 8 }, () => `<div class="strip"><b>semestra.at</b><span>Lernplaner · gratis</span></div>`).join('');
const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Semestra – Flyer A4</title><style>
@font-face{font-family:'Source Sans 3';src:url(${fontUrl('SourceSans3.ttf')});font-weight:200 900}
@font-face{font-family:'Nunito Sans';src:url(${fontUrl('NunitoSans.ttf')});font-weight:200 1000}
@font-face{font-family:'Poppins';src:url(${fontUrl('Poppins-Medium.ttf')});font-weight:500}
@page{size:A4;margin:0}
:root{--page:#f7f6fb;--sheet:#fff;--ink:#363b47;--ink-strong:#2e3240;--ink-soft:#6e7483;--ink-faint:#9aa0ad;--kick:#a3a8b5;--line:#ebe8f2;--line-2:#d9d4ea;
  --lav:#7a5bc4;--lav-bg:#efeafd;--lav-mid:#d9cff8;--rose:#c4517f;--rose-bg:#fde8f0;--rose-mid:#f6c7d9;--mint:#2f9468;--mint-bg:#e2f5ec;--mint-mid:#b9e6d1;--sky:#3b7cc0;--sky-bg:#e4effb;--sky-mid:#bfd8f3;
  --butter-mid:#f7e3a2;--praxis-bg:#e7f6ef;--praxis-fg:#2d8a5e;--blob1:#efe9fd;--blob2:#fde6ee;--blob3:#dff4ea;--blob4:#fff1cf;--blob5:#e2edfb}
*{box-sizing:border-box;margin:0}
html,body{width:210mm;height:297mm}
body{position:relative;overflow:hidden;background:var(--page);color:var(--ink);font:400 11pt/1.45 'Source Sans 3',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.blob{position:absolute;border-radius:50%;pointer-events:none}
.b1{width:150mm;height:150mm;left:-55mm;top:-70mm;background:radial-gradient(circle,var(--blob1) 0%,transparent 68%)}
.b2{width:160mm;height:160mm;right:-70mm;top:-40mm;background:radial-gradient(circle,var(--blob2) 0%,transparent 68%)}
.b3{width:140mm;height:140mm;left:20mm;top:120mm;background:radial-gradient(circle,var(--blob3) 0%,transparent 68%)}
.b4{width:120mm;height:120mm;right:-40mm;top:150mm;background:radial-gradient(circle,var(--blob5) 0%,transparent 68%)}
.page{position:absolute;inset:14mm 14mm 0 14mm}
.kicker{font:500 8.5pt/1 'Poppins',sans-serif;letter-spacing:.22em;text-transform:uppercase;color:var(--kick)}
.dots{display:flex;gap:2mm;margin-top:4mm}.dots i{width:2.4mm;height:2.4mm;border-radius:50%}
h1{margin-top:6mm;font:300 30pt/1.06 'Nunito Sans',sans-serif;letter-spacing:-.015em;color:var(--ink-strong)}
.rule{display:block;width:16mm;height:1.2mm;border-radius:1mm;background:var(--lav-mid);margin:6mm 0 5mm}
.lede{font-size:12.5pt;line-height:1.5;color:var(--ink-soft);max-width:98mm}
.top{display:grid;grid-template-columns:1fr 55mm;gap:9mm;align-items:start}
.phone{width:55mm;padding:2mm;border-radius:9mm;background:#2e3240;box-shadow:0 6mm 14mm rgba(50,40,100,.22)}
.phone img{display:block;width:100%;border-radius:7.5mm}
.pills{display:flex;flex-wrap:wrap;gap:2mm;margin-top:6mm}
.pill{padding:1.2mm 3.2mm;border-radius:99mm;background:var(--sheet);box-shadow:0 0 0 .3mm var(--line);font-size:9.5pt;color:var(--ink-soft)}
.pill b{color:var(--ink-strong)}
.feats{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:8mm}
.feat{position:relative;background:var(--sheet);border-radius:5mm;box-shadow:0 0 0 .3mm var(--line);padding:4mm 5mm 4mm 7mm}
.feat::before{content:"";position:absolute;left:0;top:4mm;bottom:4mm;width:1.2mm;border-radius:0 1mm 1mm 0;background:var(--acc-mid)}
.feat h3{display:flex;align-items:center;gap:2.5mm;font:800 11.5pt/1.25 'Nunito Sans',sans-serif;color:var(--ink-strong)}
.feat h3 i{font-style:normal;display:grid;place-items:center;width:6.5mm;height:6.5mm;border-radius:2mm;background:var(--acc-bg);color:var(--acc);font-size:9.5pt}
.feat p{margin-top:1.8mm;font-size:10pt;line-height:1.4;color:var(--ink-soft)}
.cta{display:grid;grid-template-columns:31mm 1fr;gap:7mm;align-items:center;margin-top:6mm;background:var(--sheet);border-radius:5mm;box-shadow:0 0 0 .3mm var(--line);padding:5mm 6mm}
.qr{width:31mm;height:31mm}.qr svg{width:100%;height:100%;display:block}
.cta .k{font:900 8pt/1 'Nunito Sans',sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--praxis-fg);display:flex;align-items:center;gap:2mm}
.cta .k::before{content:"✓";display:inline-grid;place-items:center;width:5mm;height:5mm;border-radius:50%;background:var(--praxis-bg);font-size:8pt}
.cta h2{margin-top:2.5mm;font:300 22pt/1.1 'Nunito Sans',sans-serif;color:var(--ink-strong)}
.cta h2 b{font-weight:800}
.cta p{margin-top:2mm;font-size:10pt;line-height:1.4;color:var(--ink-soft)}
.foot{margin-top:4mm;font-size:8.5pt;color:var(--ink-faint);display:flex;justify-content:space-between}
.strips{position:absolute;left:0;right:0;bottom:0;height:41mm;display:grid;grid-template-columns:repeat(8,1fr);border-top:.4mm dashed var(--line-2);background:var(--sheet)}
.strips::before{content:"✂";position:absolute;left:4mm;top:-3.4mm;font-size:10pt;color:var(--ink-faint);background:var(--page);padding:0 1mm}
.strip{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1mm;writing-mode:vertical-rl;transform:rotate(180deg);border-left:.3mm dashed var(--line-2)}
.strip:last-child{border-left:0}
.strip b{font:800 11pt/1 'Nunito Sans',sans-serif;color:var(--ink-strong)}
.strip span{font-size:8pt;color:var(--ink-soft)}
</style></head><body>
<span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span><span class="blob b4"></span>
<div class="page">
  <div class="top">
    <div>
      <div class="kicker">Semestra · Lernplaner</div>
      <div class="dots"><i style="background:var(--lav-mid)"></i><i style="background:var(--rose-mid)"></i><i style="background:var(--mint-mid)"></i><i style="background:var(--sky-mid)"></i><i style="background:var(--butter-mid)"></i></div>
      <h1>Deine Prüfungen, geplant rund um deine Woche.</h1>
      <span class="rule"></span>
      <p class="lede">Trag deine Prüfungstermine und deinen Stundenplan ein. Semestra füllt deine freie Zeit mit Lernblöcken und plant neu, sobald sich etwas ändert.</p>
      <div class="pills"><span class="pill"><b>Gratis</b></span><span class="pill">Kein Konto</span><span class="pill">Kein Tracking</span><span class="pill">Funktioniert offline</span></div>
    </div>
    <div class="phone"><img src="screen.png" alt=""></div>
  </div>
  <div class="feats">
    ${features.map(([c, g, h, p]) => `<div class="feat" style="--acc:var(--${c});--acc-bg:var(--${c}-bg);--acc-mid:var(--${c}-mid)"><h3><i>${g}</i>${h}</h3><p>${p}</p></div>`).join('')}
  </div>
  <div class="cta">
    <div class="qr">${qr}</div>
    <div>
      <div class="k">Probier’s aus</div>
      <h2>Scannen oder <b>semestra.at</b> öffnen</h2>
      <p>Läuft im Browser auf Handy und Laptop. Am iPhone über Teilen → „Zum Home-Bildschirm“ wie eine App nutzen. Dein Plan bleibt auf deinem Gerät.</p>
    </div>
  </div>
  <div class="foot"><span>Fragen oder Feedback: hallo@semestra.at</span><span>Entwickelt in Graz</span></div>
</div>
<div class="strips">${strips}</div>
</body></html>`;
const file = join(out, 'flyer.html');
await writeFile(file, html);

const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2.5 });
await page.goto(pathToFileURL(file).href);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.pdf({ path: join(out, 'semestra-flyer-a4.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
await page.screenshot({ path: join(out, 'semestra-flyer-a4.png') });
await browser.close();
// the working files point at this machine's fonts; only the PDF and the preview are kept
await rm(file);
await rm(join(out, 'screen.png'));
console.log('store/flyer: semestra-flyer-a4.pdf, semestra-flyer-a4.png');
