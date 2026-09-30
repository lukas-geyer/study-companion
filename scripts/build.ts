// Production build with Bun:  bun scripts/build.ts            → dist/  (installable PWA)
//                              bun scripts/build.ts --single   → dist-preview/index.html (one self-contained file)
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const root = join(import.meta.dir, '..');
const single = process.argv.includes('--single');
const out = join(root, single ? 'dist-preview' : 'dist');

await rm(out, { recursive: true, force: true });
const res = await Bun.build({
  entrypoints: [join(root, 'index.html')],
  outdir: out,
  minify: true,
  target: 'browser',
  define: { 'process.env.NODE_ENV': '"production"' },
  naming: { entry: '[name].[ext]', chunk: 'assets/[name]-[hash].[ext]', asset: 'assets/[name]-[hash].[ext]' },
});
if (!res.success) {
  for (const l of res.logs) console.error(l);
  process.exit(1);
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

let html = await readFile(join(out, 'index.html'), 'utf8');
const pwaHead = [
  '<link rel="manifest" href="./manifest.webmanifest">',
  '<link rel="icon" href="./icons/favicon.svg" type="image/svg+xml">',
  '<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">',
].join('');

if (!single) {
  // public/ → dist/ (icons, manifest, font licence); the fonts themselves are bundled by the CSS.
  await cp(join(root, 'public', 'icons'), join(out, 'icons'), { recursive: true });
  await cp(join(root, 'public', 'manifest.webmanifest'), join(out, 'manifest.webmanifest'));
  await mkdir(join(out, 'fonts'), { recursive: true });
  await cp(join(root, 'public', 'fonts', 'OFL.txt'), join(out, 'fonts', 'OFL.txt'));
  html = html.replace('<!-- PWA-HEAD -->', pwaHead);
  await writeFile(join(out, 'index.html'), html);
  // Service worker: precache every built file; a new build changes the cache name.
  const files = (await walk(out)).map((p) => './' + relative(out, p).split('\\').join('/')).filter((p) => p !== './sw.js');
  const version = Bun.hash(files.join('|') + (await Promise.all(files.map(async (f) => (await stat(join(out, f))).size))).join(',')).toString(36);
  const sw = (await readFile(join(root, 'scripts', 'sw.template.js'), 'utf8')).replace('__VERSION__', version).replace('__FILES__', JSON.stringify(['./', ...files]));
  await writeFile(join(out, 'sw.js'), sw);
  const total = (await Promise.all((await walk(out)).map(async (f) => (await stat(f)).size))).reduce((a, b) => a + b, 0);
  console.log(`dist/ ready: ${files.length + 1} files, ${(total / 1e6).toFixed(2)} MB, cache ${version}`);
} else {
  // Inline CSS (with fonts as data URIs) and JS into one HTML file.
  const mime: Record<string, string> = { '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const inlineUrls = async (css: string, base: string) => {
    const parts: string[] = [];
    let last = 0;
    for (const m of css.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) {
      const url = m[2];
      if (url.startsWith('data:')) continue;
      const file = join(base, url.replace(/^\.\//, ''));
      const buf = await readFile(file);
      parts.push(css.slice(last, m.index), `url(data:${mime[extname(file)] || 'application/octet-stream'};base64,${buf.toString('base64')})`);
      last = (m.index || 0) + m[0].length;
    }
    parts.push(css.slice(last));
    return parts.join('');
  };
  // A page fragment (the preview host adds <html>/<head>/<body>): title, inlined CSS with fonts, root, inlined JS.
  let css = '';
  for (const m of html.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)) {
    const p = join(out, m[1]);
    css += await inlineUrls(await readFile(p, 'utf8'), join(p, '..'));
  }
  let js = '';
  for (const m of html.matchAll(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g)) js += (await readFile(join(out, m[1]), 'utf8')).replace(/<\/script/gi, '<\\/script');
  const title = (html.match(/<title>([^<]*)<\/title>/) || ['', 'Study Companion'])[1];
  html = `<title>${title}</title>\n<style>${css}\n.app{padding-top:16px}</style>\n<div id="root"></div>\n<script type="module">${js}</script>\n`;
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'index.html'), html);
  console.log(`dist-preview/index.html ready: ${(html.length / 1e6).toFixed(2)} MB`);
}
