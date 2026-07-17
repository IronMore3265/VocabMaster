// Profile avatars: a fixed set of illustrated portraits, keyed by a short id
// that is what `profiles.avatar` actually stores (see 0010_profile_avatar.sql).
// Nothing is uploaded — the id names a drawing that ships with the app.
//
// Composed from parts rather than drawn twelve times: every portrait is the same
// head, neck and shoulders with a different hair shape, garment colour and
// accessory. Adding a thirteenth is a row in AVATARS, not a new illustration.
//
// Drawn on the same 64x64 grid as the brand mark in brand.js, and here for the
// same reason: this is artwork, not a UI glyph, so it does not belong in the
// swappable Lucide mapping in icons.js.
//
// The palette is deliberately FIXED rather than themed. Everything else in the
// app flips with .dark, but a face is not a surface — inverting it would put a
// near-black fill where the skin is and lose the hair against it. These portraits
// keep a light face and dark ink in both themes, the way the printed reference
// sheet does, and read against either background. The field they sit on is
// themed by the caller (avatarTile), so the surround still follows the theme.

const INK = '#1a202c';
const PAPER = '#ffffff';
const SKIN = '#fdf0e6';

// Garment / hair accents. Chosen to sit next to the Academic Clarity blues
// without competing with the primary — these are never interactive.
const C = {
  blush: '#f4a09c',
  amber: '#f5c26b',
  sky: '#93c5fd',
  mint: '#86efac',
  slate: '#64748b',
  plum: '#c4b5fd',
};

const stroke = `fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`;

// ---------- parts ----------

const shoulders = (color) => `
  <path d="M9 64C9 53 19.5 46.5 32 46.5C44.5 46.5 55 53 55 64Z" fill="${color}"/>
  <path d="M9 64C9 53 19.5 46.5 32 46.5C44.5 46.5 55 53 55 64" ${stroke}/>`;

const neck = `
  <path d="M27.5 36H36.5V46H27.5Z" fill="${SKIN}"/>
  <path d="M27.5 36V45M36.5 36V45" ${stroke}/>`;

const head = `
  <ellipse cx="32" cy="27" rx="12.5" ry="14" fill="${SKIN}" stroke="${INK}" stroke-width="1.6"/>
  <circle cx="19.2" cy="29" r="2.4" fill="${SKIN}" stroke="${INK}" stroke-width="1.4"/>
  <circle cx="44.8" cy="29" r="2.4" fill="${SKIN}" stroke="${INK}" stroke-width="1.4"/>`;

const face = ({ blush = false, smile = true } = {}) => `
  ${blush ? `<circle cx="24.5" cy="31.5" r="2.6" fill="${C.blush}" opacity="0.7"/>
  <circle cx="39.5" cy="31.5" r="2.6" fill="${C.blush}" opacity="0.7"/>` : ''}
  <circle cx="27" cy="26.5" r="1.5" fill="${INK}"/>
  <circle cx="37" cy="26.5" r="1.5" fill="${INK}"/>
  <path d="M32 27.5V31" ${stroke}/>
  <path d="${smile ? 'M29.2 34C30.4 35.4 33.6 35.4 34.8 34' : 'M29.6 34.4H34.4'}" ${stroke}/>`;

// Hair sits above the crown at y=13; each shape is a crescent over the skull.
const HAIR = {
  short: (c) => `<path d="M19.5 26C19.5 15 24.5 9.5 32 9.5C39.5 9.5 44.5 15 44.5 26C44.5 19.5 40 17 32 17C24 17 19.5 19.5 19.5 26Z" fill="${c}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`,

  swoop: (c) => `<path d="M19.5 26C19.5 14 25 9.5 32.5 9.5C41 9.5 44.5 14.5 44.5 26C44.5 20 42 17.5 36 17.5C29 17.5 24 20 21.5 26Z" fill="${c}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`,

  long: (c) => `<path d="M17.5 47C15.5 30 17 9.5 32 9.5C47 9.5 48.5 30 46.5 47L40.5 47C42.5 32 41.5 17 32 17C22.5 17 21.5 32 23.5 47Z" fill="${c}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`,

  bob: (c) => `<path d="M18.5 38C17 24 20 9.5 32 9.5C44 9.5 47 24 45.5 38C44 38 43 36 42.5 33C43.5 22 40 17 32 17C24 17 20.5 22 21.5 33C21 36 20 38 18.5 38Z" fill="${c}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`,

  // One scalloped path rather than a crescent over loose circles: the circles
  // read as a band behind a cap, and only a single path can carry the outline
  // the rest of the set has.
  curly: (c) => `<path d="M19.6 25.5C16.6 20 18.6 13.4 23.4 11.4C25.2 8.2 29 7 32 8.8C35 7 38.8 8.2 40.6 11.4C45.4 13.4 47.4 20 44.4 25.5C44.4 19.4 40 16.8 32 16.8C24 16.8 19.6 19.4 19.6 25.5Z" fill="${c}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`,

  bun: (c) => `
    <circle cx="32" cy="7.5" r="4.8" fill="${c}" stroke="${INK}" stroke-width="1.5"/>
    <path d="M19.5 26C19.5 15 24.5 9.5 32 9.5C39.5 9.5 44.5 15 44.5 26C44.5 19.5 40 17 32 17C24 17 19.5 19.5 19.5 26Z" fill="${c}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`,

  ponytail: (c) => `
    <path d="M44 22C49 24 50.5 30 49 38C48 42.5 46 44 44.5 43.5C43 43 43 41 43.5 38C44.5 31 44 26 42.5 23.5Z" fill="${c}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M19.5 26C19.5 15 24.5 9.5 32 9.5C39.5 9.5 44.5 15 44.5 26C44.5 19.5 40 17 32 17C24 17 19.5 19.5 19.5 26Z" fill="${c}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`,

  // Distinguished from `short` by hugging the skull, not by opacity — a
  // translucent fill over the skin muddied to grey and read as a helmet.
  buzz: (c) => `<path d="M19.9 24.8C19.9 15.4 25 11 32 11C39 11 44.1 15.4 44.1 24.8C44.1 19.6 39.6 17.8 32 17.8C24.4 17.8 19.9 19.6 19.9 24.8Z" fill="${c}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`,
};

const ACCESSORY = {
  none: '',

  // The lenses meet at x=32, so the bridge is the join; only the temples are drawn.
  glasses: (c) => `
    <circle cx="27" cy="26.5" r="5" fill="none" stroke="${c}" stroke-width="1.6"/>
    <circle cx="37" cy="26.5" r="5" fill="none" stroke="${c}" stroke-width="1.6"/>
    <path d="M22 25.5L19.8 26M42 25.5L44.2 26" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`,

  // Fills the lower face, not just the jaw edge — the inner boundary waves up to
  // a moustache so the shape reads as a beard rather than a chin shadow. Drawn
  // after face(), so it covers that mouth and supplies its own.
  beard: () => `
    <path d="M19.7 26.5C19.7 26.5 20.2 42.2 32 42.2C43.8 42.2 44.3 26.5 44.3 26.5C43.9 32.4 41 32 38 32.8C35.6 33.4 34 31.4 32 31.4C30 31.4 28.4 33.4 26 32.8C23 32 20.1 32.4 19.7 26.5Z" fill="${INK}"/>
    <path d="M28.8 36.4C30.2 37.9 33.8 37.9 35.2 36.4" fill="none" stroke="${SKIN}" stroke-width="1.5" stroke-linecap="round"/>`,

  cap: (c) => `
    <path d="M19 20C19 12.5 25 8 32 8C39 8 45 12.5 45 20Z" fill="${c}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M45 20C50.5 20 53 17.5 53 15C53 15 47 12.5 44 13.5" fill="${PAPER}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M19 20H45" ${stroke}/>`,

  beanie: (c) => `
    <path d="M19 21C19 12.5 25 7.5 32 7.5C39 7.5 45 12.5 45 21Z" fill="${c}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M18 21H46V25H18Z" fill="${c}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`,
};

// ---------- the set ----------
// Each entry is hair + garment + accessory. Order is the picker's order.
const RECIPES = {
  a1:  { hair: ['long', INK],      shirt: C.slate, face: { blush: true } },
  a2:  { hair: ['swoop', INK],     shirt: C.blush, acc: ['beard'] },
  a3:  { hair: ['curly', C.amber], shirt: C.slate },
  a4:  { hair: ['long', INK],      shirt: C.blush, face: { blush: true } },
  a5:  { hair: ['short', INK],     shirt: C.amber, acc: ['cap', C.amber] },
  a6:  { hair: ['bob', INK],       shirt: C.blush, acc: ['glasses', C.blush], face: { smile: false } },
  a7:  { hair: ['long', C.blush],  shirt: INK,     face: { blush: true } },
  a8:  { hair: ['buzz', INK],      shirt: INK,     acc: ['beard'] },
  a9:  { hair: ['short', INK],     shirt: C.amber, acc: ['glasses', C.blush], face: { smile: false } },
  a10: { hair: ['bun', INK],       shirt: C.mint,  face: { blush: true } },
  a11: { hair: ['ponytail', C.amber], shirt: C.sky },
  a12: { hair: ['short', INK],     shirt: C.plum,  acc: ['beanie', C.sky] },
};

function build(r) {
  const [hairName, hairColor] = r.hair;
  const [accName, accColor] = r.acc ?? ['none'];
  const hair = HAIR[hairName];
  const acc = ACCESSORY[accName];
  // Long hair falls behind the shoulders, so it has to be laid down first.
  const behind = hairName === 'long' ? hair(hairColor) : '';
  return `
    ${behind}
    ${neck}
    ${shoulders(r.shirt)}
    ${head}
    ${behind ? '' : hair(hairColor)}
    ${face(r.face ?? {})}
    ${typeof acc === 'function' ? acc(accColor) : ''}`;
}

/** id -> inner SVG markup. Built once at module load; the set never changes. */
export const AVATARS = Object.fromEntries(
  Object.entries(RECIPES).map(([id, r]) => [id, build(r)]),
);

/** The picker's order, and the allow-list updateAvatar() validates against. */
export const AVATAR_IDS = Object.keys(AVATARS);

/**
 * A portrait, or '' for a null / unrecognised id — `profiles.avatar` is
 * user-writable text, so an unknown value must never reach innerHTML. Callers
 * fall back to the initial-letter avatar when this returns ''.
 */
export function avatarSvg(id, cls = '') {
  const body = AVATARS[id];
  if (!body) return '';
  // No clipPath: the shoulders are meant to run off the edge, and the round
  // container clips them. A <clipPath id> would collide with itself the moment
  // two avatars share a page — ids are document-scoped, not svg-scoped.
  return `
  <svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${body}</svg>`;
}

/**
 * The portrait on its themed circular field — the form used everywhere an
 * avatar appears. `name` supplies the initial-letter fallback for a user who
 * has not picked one, matching what the Friends list did before avatars existed.
 */
export function avatarTile(id, name, { size = 40, cls = '' } = {}) {
  const svg = avatarSvg(id, 'w-full h-full');
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return `
  <div class="rounded-full bg-primary-fixed text-on-primary-fixed overflow-hidden shrink-0 flex items-center justify-center font-headline ${cls}"
       style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.4)}px">
    ${svg || initial}
  </div>`;
}
