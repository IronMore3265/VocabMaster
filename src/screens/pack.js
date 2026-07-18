import {
  coverageRatio, fetchPackCoverage, fetchPackProgress, fetchPackRevision, fetchPacks, masteryRatio,
} from '../api/queries.js';
import { getBestTime } from '../store.js';
import { esc, fmtTime, icon, progressBar, reviseCard, spinner, subHeader } from '../ui.js';

const TILES = [
  { kind: 'flashcards', cls: 'tile-flashcards', route: 'flashcards', title: 'Flashcards', subtitle: 'Review words', ic: 'style' },
  { kind: 'matching', cls: 'tile-matching', route: 'matching', title: 'Matching', subtitle: 'Pair words & meanings', ic: 'join_inner', type: 'matching' },
  { kind: 'fillBlank', cls: 'tile-fillBlank', route: 'fill-blank', title: 'Fill-in-the-blanks', subtitle: 'Contextual practice', ic: 'edit_note', type: 'fill_blank' },
  { kind: 'synAnt', cls: 'tile-synAnt', route: 'syn-ant', title: 'Synonym/Antonym', subtitle: 'Expand vocabulary', ic: 'compare_arrows', type: 'syn_ant' },
];

function tile(packId, t, subtitle, bestSeconds) {
  const best = typeof bestSeconds === 'number'
    ? `<span class="flex items-center gap-1 text-label-sm opacity-75">${icon('timer', 'text-[14px]')} Best ${fmtTime(bestSeconds)}</span>`
    : '';
  return `
  <button data-nav="#/practice/${packId}/${t.route}" data-online-only
    class="tile ${t.cls} rounded-3xl w-full min-h-[164px] flex flex-col items-center justify-center gap-3 p-6 text-center active:scale-[0.98] transition-transform">
    ${icon(t.ic, 'text-[42px]')}
    <div class="flex flex-col items-center gap-1">
      <span class="text-headline-sm font-headline">${t.title}</span>
      <span class="text-body-sm opacity-75">${esc(subtitle ?? t.subtitle)}</span>
      ${best}
    </div>
  </button>`;
}

function bar(label, ratio, fillClass, pctClass) {
  return `
  <div class="flex flex-col gap-2">
    <div class="flex justify-between text-body-sm">
      <span class="text-on-surface-variant">${label}</span>
      <span class="font-mono ${pctClass}">${Math.round(ratio * 100)}%</span>
    </div>
    ${progressBar(ratio, { height: 8, fillClass })}
  </div>`;
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

  Promise.all([
    fetchPacks(),
    fetchPackProgress().catch(() => []),
    fetchPackCoverage().catch(() => []),
    fetchPackRevision().catch(() => []),
  ])
    .then(([packs, progress, coverage, revision]) => {
      const pack = packs.find((p) => p.id === id);
      if (!pack) { body.innerHTML = ''; return; }
      const cov = coverageRatio(coverage.find((r) => r.pack_id === id));
      const mas = masteryRatio(progress.find((r) => r.pack_id === id));
      const rev = revision.find((r) => r.pack_id === id);
      body.innerHTML = `
      <div class="bg-surface rounded-3xl p-6 flex flex-col gap-4 shadow-card">
        <div class="flex flex-col gap-1">
          <h3 class="text-headline-sm font-headline text-on-surface">Overall Progress</h3>
          <span class="text-label-sm uppercase text-on-surface-variant">Pack ${pack.pack_number}: ${esc(pack.first_word.toUpperCase())} – ${esc(pack.last_word.toUpperCase())}</span>
        </div>
        ${bar('Progress', cov, 'bg-primary-fixed-dim', 'text-on-surface')}
        ${bar('Mastery', mas, 'bg-mastery', 'text-mastery')}
      </div>
      ${reviseCard(`#/revise/pack/${id}`, rev)}
      <div class="flex flex-col gap-4">
        ${tile(id, TILES[0], `Review ${pack.word_count} cards`)}
        ${tile(id, TILES[1], undefined, getBestTime(id, TILES[1].type))}
        ${tile(id, TILES[2], undefined, getBestTime(id, TILES[2].type))}
        ${tile(id, TILES[3], undefined, getBestTime(id, TILES[3].type))}
      </div>`;
    })
    .catch(() => {
      body.innerHTML = `<p class="text-body-sm text-error text-center py-10">Couldn't load this pack.</p>`;
    });
}
