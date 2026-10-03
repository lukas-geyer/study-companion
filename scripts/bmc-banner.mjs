// Cover banner for the Buy Me a Coffee page (buymeacoffee.com/lukasgeyer), in the Pastell design, German and English.
// 1600 × 400 is Buy Me a Coffee's recommended cover size; drawn at 2× for sharp screens. Phones crop the sides,
// so everything important sits in the middle. The page's About/Follow cards cover the bottom quarter, so the
// content stays in the top 70 %.  Output: store/bmc/semestra-bmc-cover-{de,en}.png, plus
// semestra-bmc-cover-simple.png: only the icon and the name, small enough for the narrow strip phones show and
// without fine text that the site's recompression blurs.
//
//   npm i --no-save playwright-core && node scripts/bmc-banner.mjs

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch, pastelCss, root } from './lib.mjs';

const out = join(root, 'store', 'bmc');
await mkdir(out, { recursive: true });
const css = await pastelCss();
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
${css}
*{box-sizing:border-box;margin:0}
html,body{width:1600px;height:400px}
body{position:relative;overflow:hidden;background:var(--page);font:400 20px/1.45 'Source Sans 3',sans-serif;color:var(--ink-soft)}
.blob{position:absolute;border-radius:50%}
.b1{width:760px;height:760px;left:-260px;top:-330px;background:radial-gradient(circle,var(--blob1) 0%,transparent 68%)}
.b2{width:700px;height:700px;left:-120px;top:60px;background:radial-gradient(circle,var(--blob3) 0%,transparent 68%)}
.b3{width:760px;height:760px;right:-240px;top:-360px;background:radial-gradient(circle,var(--blob2) 0%,transparent 68%)}
.b4{width:640px;height:640px;right:-120px;top:80px;background:radial-gradient(circle,var(--blob4) 0%,transparent 68%)}
.b5{width:560px;height:560px;left:520px;top:180px;background:radial-gradient(circle,var(--blob5) 0%,transparent 68%)}
.wrap{position:absolute;left:0;right:0;top:34px;height:240px;display:flex;align-items:center;justify-content:center;gap:40px}
.icon{width:112px;height:112px;border-radius:26px;box-shadow:0 0 0 1px var(--line),0 16px 34px rgba(50,40,100,.14);flex:none}
.txt{max-width:720px}
.kicker{font:500 13px/1 'Poppins',sans-serif;letter-spacing:.22em;text-transform:uppercase;color:var(--kick)}
.dots{display:flex;gap:6px;margin-top:10px}.dots i{width:8px;height:8px;border-radius:50%}
h1{margin-top:12px;font:300 42px/1.08 'Nunito Sans',sans-serif;letter-spacing:-.015em;color:var(--ink-strong)}
h1 b{font-weight:800}
h1 .cup{font-weight:400;margin-left:.2em}
.lede{margin-top:8px;font-size:18px;line-height:1.4}
.pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.pill{display:flex;align-items:center;gap:7px;padding:4px 12px 4px 6px;border-radius:99px;background:var(--sheet);box-shadow:0 0 0 1px var(--line);font-size:14.5px;color:var(--ink-strong)}
.pill i{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:var(--acc-bg);color:var(--acc);font:800 10px/1 'Nunito Sans',sans-serif;font-style:normal}
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

// language-free variant: icon and name in the middle fifth of the width
const simple = (t) => html(t)
  .replace('.txt{max-width:720px}', '.txt{max-width:none}.wrap{gap:28px}.icon{width:104px;height:104px;border-radius:24px}h1{margin-top:10px;font-size:48px}')
  .replace(/<p class="lede">[\s\S]*?<div class="pills">[\s\S]*?<\/div>/, '')
  .replace(/<h1>[\s\S]*?<\/h1>/, '<h1><b>Semestra</b></h1>')
  .replace(/<div class="kicker">[^<]*/, '<div class="kicker">Lernplaner');

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 400 }, deviceScaleFactor: 2 });
for (const [lang, t, make] of [...Object.entries(texts).map(([l, t]) => [l, t, html]), ['simple', texts.de, simple]]) {
  // opened as a file, so the page may load the font files next to it (setContent can't)
  const file = join(out, 'banner.html');
  await writeFile(file, make(t));
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(out, `semestra-bmc-cover-${lang}.png`) });
  await rm(file);
}
await browser.close();
console.log('store/bmc: semestra-bmc-cover-de.png, -en.png, -simple.png');
