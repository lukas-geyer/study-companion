// Cover banner for the Buy Me a Coffee page (buymeacoffee.com/lukasgeyer), in the Pastell design, German and English.
// 1600 × 400 is Buy Me a Coffee's recommended cover size; drawn at 2× for sharp screens. Phones crop the sides,
// so everything important sits in the middle.  Output: store/bmc/semestra-bmc-cover-{de,en}.png
//
//   npm i --no-save playwright-core && node scripts/bmc-banner.mjs
//
// Needs a Chromium; set CHROMIUM=/path/to/chrome if it isn't at /opt/pw-browsers/chromium (Claude Code cloud).
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = join(import.meta.dirname, '..');
const out = join(root, 'store', 'bmc');
await mkdir(out, { recursive: true });
const fontUrl = (f) => pathToFileURL(join(root, 'public', 'fonts', f)).href;
const icon = `data:image/png;base64,${(await readFile(join(root, 'public', 'icons', 'icon-512.png'))).toString('base64')}`;

const texts = {
  de: {
    kicker: 'Semestra · Lernplaner',
    title: 'Ein Kaffee für <b>Semestra</b>',
    lede: 'Gemacht von einem Studenten für Studierende.<br>Dein Kaffee hilft, dass Semestra weiter wächst.',
    pills: ['Gratis', 'Keine Werbung', 'Kein Tracking', 'Daten bleiben am Gerät'],
  },
  en: {
    kicker: 'Semestra · Study planner',
    title: 'A coffee for <b>Semestra</b>',
    lede: 'Made by a student, for students.<br>Your coffee helps Semestra keep growing.',
    pills: ['Free', 'No ads', 'No tracking', 'Your data stays on your device'],
  },
};
const dots = ['lav', 'rose', 'mint', 'sky', 'butter'].map((c) => `<i style="background:var(--${c}-mid)"></i>`).join('');
const pillColours = ['mint', 'lav', 'sky', 'rose'];

const html = (t) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'Source Sans 3';src:url(${fontUrl('SourceSans3.ttf')});font-weight:200 900}
@font-face{font-family:'Nunito Sans';src:url(${fontUrl('NunitoSans.ttf')});font-weight:200 1000}
@font-face{font-family:'Poppins';src:url(${fontUrl('Poppins-Medium.ttf')});font-weight:500}
:root{--page:#f7f6fb;--sheet:#fff;--ink-strong:#2e3240;--ink-soft:#6e7483;--kick:#a3a8b5;--line:#ebe8f2;
  --lav:#7a5bc4;--lav-bg:#efeafd;--lav-mid:#d9cff8;--rose:#c4517f;--rose-bg:#fde8f0;--rose-mid:#f6c7d9;--mint:#2f9468;--mint-bg:#e2f5ec;--mint-mid:#b9e6d1;
  --sky:#3b7cc0;--sky-bg:#e4effb;--sky-mid:#bfd8f3;--butter-mid:#f7e3a2;--blob1:#efe9fd;--blob2:#fde6ee;--blob3:#dff4ea;--blob4:#fff1cf;--blob5:#e2edfb}
*{box-sizing:border-box;margin:0}
html,body{width:1600px;height:400px}
body{position:relative;overflow:hidden;background:var(--page);font:400 20px/1.45 'Source Sans 3',sans-serif;color:var(--ink-soft)}
.blob{position:absolute;border-radius:50%}
.b1{width:760px;height:760px;left:-260px;top:-330px;background:radial-gradient(circle,var(--blob1) 0%,transparent 68%)}
.b2{width:700px;height:700px;left:-120px;top:60px;background:radial-gradient(circle,var(--blob3) 0%,transparent 68%)}
.b3{width:760px;height:760px;right:-240px;top:-360px;background:radial-gradient(circle,var(--blob2) 0%,transparent 68%)}
.b4{width:640px;height:640px;right:-120px;top:80px;background:radial-gradient(circle,var(--blob4) 0%,transparent 68%)}
.b5{width:560px;height:560px;left:520px;top:180px;background:radial-gradient(circle,var(--blob5) 0%,transparent 68%)}
.wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:48px}
.icon{width:132px;height:132px;border-radius:30px;box-shadow:0 0 0 1px var(--line),0 16px 34px rgba(50,40,100,.14);flex:none}
.txt{max-width:820px}
.kicker{font:500 15px/1 'Poppins',sans-serif;letter-spacing:.22em;text-transform:uppercase;color:var(--kick)}
.dots{display:flex;gap:7px;margin-top:12px}.dots i{width:9px;height:9px;border-radius:50%}
h1{margin-top:16px;font:300 50px/1.08 'Nunito Sans',sans-serif;letter-spacing:-.015em;color:var(--ink-strong)}
h1 b{font-weight:800}
h1 .cup{font-weight:400;margin-left:.2em}
.lede{margin-top:12px;font-size:21px;line-height:1.45}
.pills{display:flex;flex-wrap:wrap;gap:9px;margin-top:18px}
.pill{display:flex;align-items:center;gap:7px;padding:5px 14px 5px 7px;border-radius:99px;background:var(--sheet);box-shadow:0 0 0 1px var(--line);font-size:16.5px;color:var(--ink-strong)}
.pill i{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--acc-bg);color:var(--acc);font:800 11px/1 'Nunito Sans',sans-serif;font-style:normal}
</style></head><body>
<span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span><span class="blob b4"></span><span class="blob b5"></span>
<div class="wrap">
  <img class="icon" src="${icon}" alt="">
  <div class="txt">
    <div class="kicker">${t.kicker}</div>
    <div class="dots">${dots}</div>
    <h1>${t.title}<span class="cup">☕</span></h1>
    <p class="lede">${t.lede}</p>
    <div class="pills">${t.pills.map((p, i) => `<span class="pill" style="--acc:var(--${pillColours[i]});--acc-bg:var(--${pillColours[i]}-bg)"><i>✓</i>${p}</span>`).join('')}</div>
  </div>
</div>
</body></html>`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 400 }, deviceScaleFactor: 2 });
for (const [lang, t] of Object.entries(texts)) {
  // opened as a file, so the page may load the font files next to it (setContent can't)
  const file = join(out, 'banner.html');
  await writeFile(file, html(t));
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(out, `semestra-bmc-cover-${lang}.png`) });
  await rm(file);
}
await browser.close();
console.log('store/bmc: semestra-bmc-cover-de.png, semestra-bmc-cover-en.png');
