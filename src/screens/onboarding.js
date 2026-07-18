// First-launch tour: feature slides, then a theme setup slide. Marks the device
// onboarded and moves on to sign-in.
//
// Each slide's art demonstrates its feature rather than badging it — the tiles
// deal out, the coach draws in weak words, the friends slide lights a shared
// streak. The motion is all CSS (see the Onboarding block in style.css), so the
// global prefers-reduced-motion rule flattens it without a second code path.
import { setOnboarded } from '../store.js';
import { navigate } from '../router.js';
import { logoMark } from '../brand.js';
import { avatarTile } from '../avatars.js';
import { bindThemeChooser, icon, primaryBtn, themeChooser } from '../ui.js';

const SLIDES = [
  {
    art: brandBadge,
    title: 'Welcome to VocabMaster',
    copy: 'Master the Word Smart 1 & 2 lists — the academic vocabulary that IELTS rewards.',
  },
  {
    art: tileGrid,
    title: 'Practice, four ways',
    copy: 'Flashcards, matching, fill-in-the-blank and synonym/antonym drills for every word pack.',
  },
  {
    art: coachArt,
    title: 'A coach that adapts',
    copy: 'The AI coach builds sessions from the words you keep missing, and analytics track your streak and mastery.',
  },
  {
    art: friendsArt,
    title: 'Better with friends',
    copy: 'Share your code to connect, compare progress, and build a streak together — practise on the same day to keep it alive.',
  },
  {
    setup: true,
    art: () => badge('theme'),
    title: 'Pick your look',
    copy: 'Choose a theme — you can change it any time in Settings.',
  },
];

function badge(name) {
  return `
  <div class="float w-28 h-28 rounded-[2rem] bg-primary-fixed flex items-center justify-center">
    ${icon(name, 'text-primary text-[56px]')}
  </div>`;
}

// The welcome slide is the app introducing itself — it gets the real mark.
function brandBadge() {
  return `
  <div class="float w-28 h-28 rounded-[2rem] bg-primary-fixed flex items-center justify-center">
    ${logoMark({ size: 62, cls: 'text-primary' })}
  </div>`;
}

// The four exercise types each play a mini-demo in turn — a card flips, a pair
// matches, a blank fills, a synonym swaps to its antonym — while the tile dots
// underneath light up in step. All scenes share one 12s CSS cycle; --ob-i
// staggers each scene (and its inner motion) by 3s. See .ob-scene in style.css.
function tileGrid() {
  const dot = (cls, name, i) => `
    <div class="ob-tile-dot tile ${cls} rounded-xl w-11 h-11 flex items-center justify-center" style="--ob-i:${i}">
      ${icon(name, 'text-[22px]')}
    </div>`;
  const matchChip = (label, cls = '') => `
    <span class="${cls} rounded-full bg-surface shadow-card px-3.5 py-1.5 text-[12px] text-on-surface">${label}</span>`;
  return `
  <div class="flex flex-col items-center gap-5">
    <div class="relative w-72 h-32">
      <div class="ob-scene flex items-center justify-center" style="--ob-i:0">
        <div class="w-44" style="perspective:500px;height:6.5rem">
          <div class="ob-flip relative w-full h-full">
            <div class="ob-face absolute inset-0 rounded-xl bg-surface shadow-card flex items-center justify-center text-[16px] font-headline text-on-surface">ubiquitous</div>
            <div class="ob-face ob-face-back absolute inset-0 rounded-xl bg-primary-fixed flex items-center justify-center px-4 text-center text-[13px] text-on-primary-fixed">found everywhere at once</div>
          </div>
        </div>
      </div>
      <div class="ob-scene grid grid-cols-2 gap-2.5 content-center justify-items-center" style="--ob-i:1">
        ${matchChip('averse', 'ob-match-a')}
        ${matchChip('candid')}
        ${matchChip('frank')}
        ${matchChip('reluctant', 'ob-match-b')}
      </div>
      <div class="ob-scene flex items-center justify-center" style="--ob-i:2">
        <div class="rounded-xl bg-surface shadow-card px-4 py-3 text-[14px] text-on-surface">
          The evidence was
          <span class="inline-block relative text-center border-b-2 border-primary" style="min-width:5.2em">
            <span class="ob-fill-word font-headline text-primary">conclusive</span>
          </span>.
        </div>
      </div>
      <div class="ob-scene flex items-center justify-center gap-2.5" style="--ob-i:3">
        ${matchChip('candid')}
        ${icon('compare_arrows', 'text-on-surface-variant text-[20px]')}
        <span class="grid">
          <span class="ob-syn col-start-1 row-start-1 rounded-full bg-surface shadow-card px-3.5 py-1.5 text-[12px] font-medium text-secondary">frank</span>
          <span class="ob-ant col-start-1 row-start-1 rounded-full bg-surface shadow-card px-3.5 py-1.5 text-[12px] font-medium text-error">evasive</span>
        </span>
      </div>
    </div>
    <div class="flex gap-2.5">
      ${dot('tile-flashcards', 'style', 0)}
      ${dot('tile-matching', 'join_inner', 1)}
      ${dot('tile-fillBlank', 'edit_note', 2)}
      ${dot('tile-synAnt', 'compare_arrows', 3)}
    </div>
  </div>`;
}

// Weak words fly into the coach, which pulses as each lands; gold sparks pop
// off the badge on the beat, the glyph twinkles, and the session bar underneath
// fills as the coach assembles the next drill. All loops share the chips' 2.8s
// cycle so the whole scene breathes together.
function coachArt() {
  const chip = (label, x, y) => `
    <span class="ob-chip absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-surface-container px-2.5 py-1 text-[11px] text-on-surface-variant shadow-card inline-flex items-center gap-1.5"
      style="--from-x:${x}px;--from-y:${y}px"><span class="w-1.5 h-1.5 rounded-full bg-error"></span>${label}</span>`;
  const spark = (x, y, d) => `
    <span class="ob-spark absolute left-1/2 top-1/2" style="--sx:${x}px;--sy:${y}px;--d:${d}s">${icon('auto_awesome', 'text-mastery text-[15px]')}</span>`;
  return `
  <div class="relative w-44 h-36 flex items-center justify-center">
    <span class="ob-ring absolute w-28 h-28 rounded-full border-2 border-primary"></span>
    <div class="relative">
      <div class="ob-pulse w-24 h-24 rounded-[1.7rem] bg-primary-fixed flex items-center justify-center">
        <span class="ob-coach-icon flex">${icon('auto_awesome', 'text-primary text-[46px]')}</span>
      </div>
      ${spark(-58, -34, 0)}
      ${spark(52, -46, 0.15)}
      ${spark(60, 22, 0.3)}
      ${spark(-48, 40, 0.45)}
      <div class="absolute left-1/2 -translate-x-1/2 w-20 h-1.5 rounded-full bg-progress-track overflow-hidden" style="bottom:-14px">
        <div class="ob-session-fill h-full rounded-full bg-primary"></div>
      </div>
    </div>
    ${chip('ubiquitous', -74, -40)}
    ${chip('candid', 78, -14)}
    ${chip('averse', -68, 46)}
  </div>`;
}

// Two faces drift together and the shared streak ignites between them — the
// mutual streak the Friends tab actually shows.
function friendsArt() {
  return `
  <div class="relative w-44 h-32 flex items-center justify-center">
    <div class="ob-friend-l absolute" style="left:8px">${avatarTile('a3', 'A', { size: 66 })}</div>
    <div class="ob-friend-r absolute" style="right:8px">${avatarTile('a6', 'B', { size: 66 })}</div>
    <div class="ob-flame relative z-10 flex flex-col items-center gap-0.5 rounded-full bg-surface px-2.5 py-1.5 shadow-card">
      ${icon('local_fire_department', 'text-primary text-[24px]')}
      <span class="font-mono text-[11px] leading-none text-on-surface">7</span>
    </div>
  </div>`;
}

export function render() {
  return `<div class="min-h-dvh bg-background flex flex-col pt-safe pb-safe overflow-hidden" data-onboarding></div>`;
}

export function mount(root) {
  const host = root.querySelector('[data-onboarding]');
  let step = 0;
  let busy = false;

  // The chrome is drawn once; only the slide is swapped, so the buttons and dots
  // don't flash on every step.
  host.innerHTML = `
    <div class="h-12"></div>
    <div data-stage class="flex-1 flex flex-col justify-center overflow-hidden"></div>
    <div class="px-8 pb-8 flex flex-col gap-5">
      <div data-dots class="flex justify-center gap-2"></div>
      <div class="flex gap-3">
        <button data-back class="px-6 h-[54px] rounded-full border border-outline-variant text-on-surface text-body-md font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
          ${icon('arrow_back', 'text-[20px]')}<span>Back</span>
        </button>
        <div class="flex-1">${primaryBtn('Next', 'data-next')}</div>
      </div>
      <button data-skip class="self-center px-6 py-2.5 rounded-full border border-outline-variant text-on-surface-variant text-body-sm active:scale-[0.98] transition-transform">Skip tour</button>
    </div>`;

  const stage = host.querySelector('[data-stage]');
  const dots = host.querySelector('[data-dots]');
  const backBtn = host.querySelector('[data-back]');
  const nextBtn = host.querySelector('[data-next]');
  const skipBtn = host.querySelector('[data-skip]');

  const slideHtml = (slide) => `
    <div class="flex flex-col items-center justify-center px-8 gap-8 text-center">
      ${slide.art()}
      <div class="flex flex-col gap-3 max-w-sm">
        <h1 class="text-headline-lg font-headline text-on-surface">${slide.title}</h1>
        <p class="text-body-md text-on-surface-variant">${slide.copy}</p>
      </div>
      ${slide.setup ? `<div class="w-full max-w-sm">${themeChooser()}</div>` : ''}
    </div>`;

  function paintChrome() {
    const last = step === SLIDES.length - 1;
    dots.innerHTML = SLIDES.map((_, i) =>
      `<span class="h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-outline-variant'}"></span>`).join('');
    backBtn.classList.toggle('hidden', step === 0);
    skipBtn.classList.toggle('invisible', last);
    nextBtn.textContent = last ? 'Get Started' : 'Next';
  }

  function draw(dir) {
    const slide = SLIDES[step];
    const el = document.createElement('div');
    el.className = 'ob-slide';
    el.setAttribute('data-dir', dir);
    el.innerHTML = slideHtml(slide);
    stage.replaceChildren(el);
    if (slide.setup) bindThemeChooser(el);
    paintChrome();
  }

  // Animates the current slide out, then swaps. `busy` swallows taps mid-swap so
  // a fast double-tap can't skip a slide or leave two mounted.
  function go(next) {
    if (busy || next === step || next < 0 || next >= SLIDES.length) return;
    const fwd = next > step;
    const current = stage.firstElementChild;
    busy = true;
    if (current) current.setAttribute('data-dir', fwd ? 'out-fwd' : 'out-back');
    setTimeout(() => {
      step = next;
      draw(fwd ? 'fwd' : 'back');
      busy = false;
    }, 180); // matches the ob-slide out duration in style.css
  }

  const finish = () => {
    setOnboarded(true);
    navigate('#/sign-in');
  };

  nextBtn.addEventListener('click', () => {
    if (step === SLIDES.length - 1) finish();
    else go(step + 1);
  });
  backBtn.addEventListener('click', () => go(step - 1));
  skipBtn.addEventListener('click', finish);

  // Swipe between slides. Same shape as the sheet's swipe-to-dismiss in ui.js:
  // track the axis, and only claim the gesture once it's clearly horizontal, so
  // a vertical scroll on a short screen still works.
  let startX = null, startY = null, axis = null;
  const onStart = (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    axis = null;
  };
  const onMove = (e) => {
    if (startX === null) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (!axis && Math.abs(dx) + Math.abs(dy) > 10) axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (axis === 'x') e.preventDefault();
  };
  const onEnd = (e) => {
    if (startX === null || axis !== 'x') { startX = null; return; }
    const dx = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0 && step < SLIDES.length - 1) go(step + 1);
    else if (dx > 0) go(step - 1);
  };
  stage.addEventListener('touchstart', onStart, { passive: true });
  stage.addEventListener('touchmove', onMove, { passive: false });
  stage.addEventListener('touchend', onEnd);
  stage.addEventListener('touchcancel', () => { startX = null; });

  // Keyboard, for the web build.
  const onKeydown = (e) => {
    if (e.key === 'ArrowRight') go(step + 1);
    else if (e.key === 'ArrowLeft') go(step - 1);
  };
  document.addEventListener('keydown', onKeydown);

  draw('fwd');
  return () => document.removeEventListener('keydown', onKeydown);
}
