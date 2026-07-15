import { fetchPackProgress, fetchPacks, progressRatio } from '../api/queries.js';
import { esc, icon, progressRing, spinner, subHeader } from '../ui.js';

const TILES = [
  { kind: 'flashcards', cls: 'tile-flashcards', route: 'flashcards', title: 'Flashcards', subtitle: 'Review words', ic: 'style' },
  { kind: 'matching', cls: 'tile-matching', route: 'matching', title: 'Matching', subtitle: 'Pair words & meanings', ic: 'join_inner' },
  { kind: 'fillBlank', cls: 'tile-fillBlank', route: 'fill-blank', title: 'Fill-in-the-blanks', subtitle: 'Contextual practice', ic: 'edit_note' },
  { kind: 'synAnt', cls: 'tile-synAnt', route: 'syn-ant', title: 'Synonym/Antonym', subtitle: 'Expand vocabulary', ic: 'compare_arrows' },
];

function tile(packId, t, subtitle) {
  return `
  <button data-nav="#/practice/${packId}/${t.route}"
    class="tile ${t.cls} rounded-3xl min-h-[150px] flex flex-col items-center justify-center gap-2 p-4 text-center active:scale-[0.98] transition-transform">
    ${icon(t.ic, 'text-[32px]')}
    <span class="text-[16px] font-headline">${t.title}</span>
    <span class="text-body-sm opacity-75">${esc(subtitle ?? t.subtitle)}</span>
  </button>`;
}

export function render(packId) {
  return `
  ${subHeader('Practice')}
  <main class="pt-page pb-page-sub px-5">
    <div class="flex flex-col gap-1 mt-1 mb-4">
      <h2 class="text-headline-lg font-headline text-on-surface">Practice</h2>
      <p class="text-body-md text-on-surface-variant">Master your vocabulary pack.</p>
    </div>
    <div data-body class="flex flex-col gap-4">
      <div class="flex justify-center py-10">${spinner()}</div>
    </div>
  </main>`;
}

export function mount(root, packId) {
  const id = Number(packId);
  const body = root.querySelector('[data-body]');

  Promise.all([fetchPacks(), fetchPackProgress().catch(() => [])])
    .then(([packs, progress]) => {
      const pack = packs.find((p) => p.id === id);
      if (!pack) { body.innerHTML = ''; return; }
      const ratio = progressRatio(progress.find((r) => r.pack_id === id));
      body.innerHTML = `
      <div class="bg-surface rounded-3xl p-6 flex items-center justify-between shadow-card">
        <div class="flex flex-col gap-1.5 flex-1 pr-3">
          <h3 class="text-headline-sm font-headline text-on-surface">Overall Progress</h3>
          <span class="text-label-sm uppercase text-on-surface-variant">Pack ${pack.pack_number}: ${esc(pack.first_word.toUpperCase())} – ${esc(pack.last_word.toUpperCase())}</span>
        </div>
        ${progressRing({ progress: ratio })}
      </div>
      <div class="grid grid-cols-2 gap-4">
        ${tile(id, TILES[0], `Review ${pack.word_count} words`)}
        ${tile(id, TILES[1])}
        ${tile(id, TILES[2])}
        ${tile(id, TILES[3])}
      </div>`;
    })
    .catch(() => {
      body.innerHTML = `<p class="text-body-sm text-error text-center py-10">Couldn't load this pack.</p>`;
    });
}
