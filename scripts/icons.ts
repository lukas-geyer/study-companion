// App icons from one SVG (pastel card with three study blocks):  bun scripts/icons.ts
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const dir = join(import.meta.dir, '..', 'public', 'icons');
await mkdir(dir, { recursive: true });

const art = (pad: number) => `
  <defs>
    <radialGradient id="b1" cx="18%" cy="12%" r="60%"><stop offset="0" stop-color="#e9e1fd"/><stop offset="1" stop-color="#e9e1fd" stop-opacity="0"/></radialGradient>
    <radialGradient id="b2" cx="92%" cy="20%" r="55%"><stop offset="0" stop-color="#fde0ea"/><stop offset="1" stop-color="#fde0ea" stop-opacity="0"/></radialGradient>
    <radialGradient id="b3" cx="40%" cy="100%" r="60%"><stop offset="0" stop-color="#d9f2e6"/><stop offset="1" stop-color="#d9f2e6" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="512" height="512" fill="#f7f6fb"/>
  <rect width="512" height="512" fill="url(#b1)"/><rect width="512" height="512" fill="url(#b2)"/><rect width="512" height="512" fill="url(#b3)"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})">
    <rect x="96" y="92" width="320" height="328" rx="44" fill="#ffffff"/>
    <rect x="96" y="92" width="320" height="328" rx="44" fill="none" stroke="#ebe8f2" stroke-width="4"/>
    <rect x="136" y="148" width="240" height="56" rx="16" fill="#efeafd"/><rect x="136" y="148" width="10" height="56" rx="5" fill="#d9cff8"/>
    <rect x="136" y="228" width="176" height="56" rx="16" fill="#fde8f0"/><rect x="136" y="228" width="10" height="56" rx="5" fill="#f6c7d9"/>
    <rect x="136" y="308" width="208" height="56" rx="16" fill="#e2f5ec"/><rect x="136" y="308" width="10" height="56" rx="5" fill="#b9e6d1"/>
    <path d="M168 176 l14 -14 l14 14 l-14 14 z" fill="#7a5bc4"/>
    <path d="M168 256 l14 -14 l14 14 l-14 14 z" fill="none" stroke="#c4517f" stroke-width="5"/>
    <path d="M166 336 l10 10 l20 -22" fill="none" stroke="#2f9468" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;

const svg = (pad: number, round: boolean) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${round ? '<clipPath id="c"><rect width="512" height="512" rx="112"/></clipPath><g clip-path="url(#c)">' : '<g>'}${art(pad)}</g></svg>`;

await writeFile(join(dir, 'favicon.svg'), svg(8, true));
const png = (s: string, size: number, name: string) => sharp(Buffer.from(s)).resize(size, size).png().toFile(join(dir, name));
await png(svg(0, false), 180, 'apple-touch-icon.png');
await png(svg(8, true), 192, 'icon-192.png');
await png(svg(8, true), 512, 'icon-512.png');
await png(svg(56, false), 512, 'maskable-512.png');
console.log('icons written to public/icons');
