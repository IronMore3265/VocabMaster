import {
  coverageRatio, fetchPackCoverage, fetchPackProgress, fetchPackRevision, fetchPacks, masteryRatio,
} from '../api/queries.js';
import { getBestTime, getSettings, setSettings } from '../store.js';
import { navigate } from '../router.js';
import { esc, fmtTime, icon, progressBar, reviseCard, showSheet, spinner, subHeader } from '../ui.js';

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
  // Synonym/Antonym opens a scope chooser (Quick vs Full) rather than navigating
  // straight through; everything else is a plain in-page nav.
  const action = t.kind === 'synAnt'
    ? `data-synant="${packId}"`
    : `data-nav="#/practice/${packId}/${t.route}"`;
  return `
  <button ${action} data-online-only
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

// Lets the user pick how much Synonym/Antonym to drill, and remembers it. "Quick"
// keeps the classic one-question-per-word set; "Full" tests both the synonym and
// the antonym of every word (up to ~2x the questions).
function showSynAntChooser(packId) {
  const current = getSettings().synAntMode;
  const opt = (mode, title, sub) => `
    <button data-mode="${mode}" class="w-full text-left rounded-2xl border ${
      current === mode ? 'border-primary bg-primary-fixed/40' : 'border-outline-variant'
    } p-4 active:scale-[0.98] transition-transform">
      <p class="text-body-lg font-medium text-on-surface">${esc(title)}</p>
      <p class="text-body-sm text-on-surface-variant">${esc(sub)}</p>
    </button>`;
  const { el, close } = showSheet(`
    <h2 class="text-headline-sm font-headline text-on-surface mb-1">Synonym / Antonym</h2>
    <p class="text-body-sm text-on-surface-variant mb-5">Choose how much to practise.</p>
    <div class="flex flex-col gap-3">
      ${opt('quick', 'Quick review', 'One question per word')}
      ${opt('full', 'Full drill', 'Synonyms and antonyms for every word')}
    </div>`);
  el.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    const mode = b.getAttribute('data-mode');
    setSettings({ synAntMode: mode });
    close();
    navigate(mode === 'full' ? `#/practice/${packId}/syn-ant/full` : `#/practice/${packId}/syn-ant`);
  }));
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
      body.querySelector('[data-synant]')?.addEventListener('click', () => showSynAntChooser(id));
    })
    .catch(() => {
      body.innerHTML = `<p class="text-body-sm text-error text-center py-10">Couldn't load this pack.</p>`;
    });
}
