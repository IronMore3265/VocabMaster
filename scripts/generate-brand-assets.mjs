// Regenerates the native icon sources in assets/ from the one brand geometry.
//
// Run via `npm run assets`, which then hands off to @capacitor/assets to fan
// these out into android/ mipmaps + splash densities. Before this the PNGs were
// produced by an undocumented one-off command, so the launcher art couldn't be
// rebuilt from source.
//
// Adaptive-icon note: capacitor-assets wraps both layers in `inset 16.7%`.
// 16.7% of the 108dp adaptive grid is 18dp a side, which leaves exactly the
// centre 72x72dp — the region Android actually masks and shows. So a
// full-bleed source maps onto the whole visible icon, and the foreground mark
// is sized to sit inside the 66dp safe circle within it.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets');

const BLUE = '#2563eb';
const PRIMARY_FIXED = '#dbeafe'; // --color-primary-fixed (light)
const BG_LIGHT = '#f8f9fa'; // --color-background (light)
const BG_DARK = '#121212'; // --color-background (dark)
const PRIMARY_FIXED_DARK = '#1e3a8a';
const PRIMARY_DARK = '#60a5fa';

const SIZE = 1024;
const SPLASH = 2732;

// Keep in sync with PAGE_LEFT / PAGE_RIGHT in src/brand.js.
const PAGE_LEFT =
  'M31 50L23 28C18 22 12 19 8 19Q6 19 6 21L6 40Q6 42 8 42C16 42 25 45 31 50Z';
const PAGE_RIGHT =
  'M33 50L41 28C46 22 52 19 56 19Q58 19 58 21L58 40Q58 42 56 42C48 42 39 45 33 50Z';

// Tight bounds of the mark within the 64x64 grid.
const MARK = { x: 6, y: 19, w: 52, h: 31 };

const pages = (fill) =>
  `<path d="${PAGE_LEFT}" fill="${fill}"/><path d="${PAGE_RIGHT}" fill="${fill}"/>`;

/** The mark, scaled to `frac` of `canvas` width and centred on it. */
function markLayer(fill, frac, canvas = SIZE) {
  const w = canvas * frac;
  const h = (w / MARK.w) * MARK.h;
  const x = (canvas - w) / 2;
  const y = (canvas - h) / 2;
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${MARK.x} ${MARK.y} ${MARK.w} ${MARK.h}">${pages(fill)}</svg>`;
}

const doc = (inner, canvas = SIZE) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}" viewBox="0 0 ${canvas} ${canvas}">${inner}</svg>`;

/** The app lockup — mark on its rounded field — centred on a splash canvas. */
function splashDoc(bg, field, ink) {
  const tile = SPLASH * 0.16;
  const x = (SPLASH - tile) / 2;
  const markW = tile * 0.58;
  const markH = (markW / MARK.w) * MARK.h;
  return doc(
    `<rect width="${SPLASH}" height="${SPLASH}" fill="${bg}"/>
     <rect x="${x}" y="${x}" width="${tile}" height="${tile}" rx="${tile * 0.28}" fill="${field}"/>
     <svg x="${(SPLASH - markW) / 2}" y="${(SPLASH - markH) / 2}" width="${markW}" height="${markH}" viewBox="${MARK.x} ${MARK.y} ${MARK.w} ${MARK.h}">${pages(ink)}</svg>`,
    SPLASH,
  );
}

const FILES = {
  // Legacy square/round launcher art. 0.52 keeps the mark clear of the circle
  // edge once a round mask crops it.
  'icon.png': doc(
    `<rect width="${SIZE}" height="${SIZE}" rx="${SIZE * 0.22}" fill="${BLUE}"/>${markLayer('#ffffff', 0.52)}`,
  ),
  // Adaptive background layer: full bleed, so it covers the whole masked area.
  'icon-background.png': doc(`<rect width="${SIZE}" height="${SIZE}" fill="${BLUE}"/>`),
  // Adaptive foreground layer: transparent, mark inside the safe circle.
  'icon-foreground.png': doc(markLayer('#ffffff', 0.6)),
  // Splashes match the app's own background tokens, so the launch screen hands
  // over to the web view without a flash of a different colour.
  'splash.png': splashDoc(BG_LIGHT, PRIMARY_FIXED, BLUE),
  'splash-dark.png': splashDoc(BG_DARK, PRIMARY_FIXED_DARK, PRIMARY_DARK),
};

await mkdir(OUT, { recursive: true });
for (const [name, svg] of Object.entries(FILES)) {
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile(join(OUT, name), png);
  console.log(`wrote assets/${name}`);
}

// Vector copies: assets/logo.svg is the design source of record; public/ is what
// Vite serves as the favicon.
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="VocabMaster">
  <rect width="64" height="64" rx="14" fill="${BLUE}"/>
  <path d="${PAGE_LEFT}" fill="#ffffff"/>
  <path d="${PAGE_RIGHT}" fill="#ffffff"/>
</svg>
`;
await writeFile(join(OUT, 'logo.svg'), LOGO_SVG);
console.log('wrote assets/logo.svg');

const PUBLIC = join(ROOT, 'public');
await mkdir(PUBLIC, { recursive: true });
await writeFile(join(PUBLIC, 'favicon.svg'), LOGO_SVG);
console.log('wrote public/favicon.svg');
