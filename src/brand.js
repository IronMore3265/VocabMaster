// The VocabMaster mark: an open book whose page edges rise from the spine to
// form a V. It is artwork, not a UI glyph, so it lives here rather than in the
// ICONS map — icons.js is a swappable Lucide mapping, this is the brand.
//
// One geometry backs every surface (launcher, splash, sign-in, book tiles, and
// assets/logo.svg). Before this, the sign-in tile, the boot splash and the
// launcher art were three different marks for one app.

// Drawn on a 64x64 grid. The pages converge to a point at bottom-centre, so the
// gap between them is a letter V in negative space — the book and the V are the
// same shape rather than two ideas stacked. Verified legible down to 36px.
const PAGE_LEFT =
  'M31 50L23 28C18 22 12 19 8 19Q6 19 6 21L6 40Q6 42 8 42C16 42 25 45 31 50Z';
const PAGE_RIGHT =
  'M33 50L41 28C46 22 52 19 56 19Q58 19 58 21L58 40Q58 42 56 42C48 42 39 45 33 50Z';

/**
 * The mark alone, in currentColor — for placing on a tile that supplies the
 * field colour (and therefore themes with it).
 */
export function logoMark({ size = 40, cls = '' } = {}) {
  return `
  <svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 64 64"
       fill="currentColor" aria-hidden="true" focusable="false">
    <path d="${PAGE_LEFT}" />
    <path d="${PAGE_RIGHT}" />
  </svg>`;
}

/**
 * The full app lockup — mark on its rounded field. Sign-in and the boot splash
 * both use this so they cannot drift apart again.
 */
export function logoTile({ size = 72, cls = '' } = {}) {
  return `
  <div class="rounded-3xl bg-primary-fixed flex items-center justify-center shrink-0 ${cls}"
       style="width:${size}px;height:${size}px">
    ${logoMark({ size: Math.round(size * 0.58), cls: 'text-primary' })}
  </div>`;
}

/**
 * A library book tile: the app mark on a per-book field, badged with the book
 * number. The two Word Smart books previously shared one "Aa" glyph and were
 * told apart only by their gradient — now they're the same family, numbered.
 * Colours come from .book-tile-N in style.css, so both themes are handled.
 */
export function bookTile(n, { size = 64 } = {}) {
  return `
  <div class="book-tile-${n} relative rounded-2xl flex items-center justify-center shrink-0"
       style="width:${size}px;height:${size}px">
    ${logoMark({ size: Math.round(size * 0.56) })}
    <span class="book-badge absolute bottom-1 right-1 w-[19px] h-[19px] rounded-full flex items-center justify-center font-mono text-[11px] leading-none">${n}</span>
  </div>`;
}
