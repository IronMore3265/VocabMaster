// First-launch tour (inspired by ReFocus onboarding): a few feature slides, then
// a theme setup slide. Marks the device onboarded and moves on to sign-in.
import { setOnboarded } from '../store.js';
import { navigate } from '../router.js';
import { bindThemeChooser, icon, primaryBtn, themeChooser } from '../ui.js';

const SLIDES = [
  {
    art: badge('menu_book'),
    title: 'Welcome to VocabMaster',
    copy: 'Master the Word Smart 1 & 2 lists — the academic vocabulary that IELTS rewards.',
  },
  {
    art: tileGrid(),
    title: 'Practice, four ways',
    copy: 'Flashcards, matching, fill-in-the-blank and synonym/antonym drills for every word pack.',
  },
  {
    art: badge('auto_awesome'),
    title: 'A coach that adapts',
    copy: 'The AI coach builds sessions from the words you keep missing, and analytics track your streak and mastery.',
  },
  {
    setup: true,
    art: badge('theme'),
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

function tileGrid() {
  const t = (cls, name) => `<div class="tile ${cls} rounded-2xl aspect-square flex items-center justify-center">${icon(name, 'text-[28px]')}</div>`;
  return `
  <div class="float grid grid-cols-2 gap-3 w-44">
    ${t('tile-flashcards', 'style')}
    ${t('tile-matching', 'join_inner')}
    ${t('tile-fillBlank', 'edit_note')}
    ${t('tile-synAnt', 'compare_arrows')}
  </div>`;
}

export function render() {
  return `<div class="min-h-dvh bg-background flex flex-col pt-safe pb-safe" data-onboarding></div>`;
}

export function mount(root) {
  const host = root.querySelector('[data-onboarding]');
  let step = 0;

  const draw = () => {
    const slide = SLIDES[step];
    const last = step === SLIDES.length - 1;
    host.innerHTML = `
    <div class="flex justify-end px-5 pt-3 h-12">
      ${step < SLIDES.length - 1 ? '<button data-skip class="text-body-sm text-on-surface-variant px-2 py-1">Skip</button>' : ''}
    </div>

    <div class="flex-1 flex flex-col items-center justify-center px-8 gap-8 text-center fade-in" data-slide>
      ${slide.art}
      <div class="flex flex-col gap-3 max-w-sm">
        <h1 class="text-headline-lg font-headline text-on-surface">${slide.title}</h1>
        <p class="text-body-md text-on-surface-variant">${slide.copy}</p>
      </div>
      ${slide.setup ? `<div class="w-full max-w-sm">${themeChooser()}</div>` : ''}
    </div>

    <div class="px-8 pb-8 flex flex-col gap-5">
      <div class="flex justify-center gap-2">
        ${SLIDES.map((_, i) => `<span class="h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-outline-variant'}"></span>`).join('')}
      </div>
      ${primaryBtn(last ? 'Get Started' : 'Next', 'data-next')}
    </div>`;

    if (slide.setup) bindThemeChooser(host);
    host.querySelector('[data-skip]')?.addEventListener('click', finish);
    host.querySelector('[data-next]')?.addEventListener('click', () => {
      if (last) finish();
      else { step++; draw(); }
    });
  };

  const finish = () => {
    setOnboarded(true);
    navigate('#/sign-in');
  };

  draw();
}
