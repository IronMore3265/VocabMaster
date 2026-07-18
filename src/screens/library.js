import { coverageRatio, fetchPackCoverage, fetchPackProgress } from '../api/queries.js';
import { BOOKS_META } from '../lib/models.js';
import { bookTile } from '../brand.js';
import { appHeader, bottomNav, esc, progressBar, spinner } from '../ui.js';

// A labelled mini bar for a book card (blue Progress, gold Mastery), matching
// the pack cards in book.js.
function miniBar(label, ratio, fillClass, pctClass) {
  return `
  <div class="flex items-center gap-2.5">
    <span class="w-14 shrink-0 text-label-sm text-on-surface-variant">${label}</span>
    <div class="flex-1">${progressBar(ratio, { height: 6, fillClass })}</div>
    <span class="w-9 shrink-0 text-right text-label-sm font-mono ${pctClass}">${Math.round(ratio * 100)}%</span>
  </div>`;
}

function bookCard(meta, progress, mastery) {
  return `
  <button data-nav="#/book/${meta.book}" class="text-left bg-surface rounded-3xl p-5 shadow-card active:scale-[0.98] transition-transform">
    <div class="flex items-start gap-4">
      ${bookTile(meta.book)}
      <div class="flex-1 min-w-0 pt-0.5">
        <p class="text-label-sm uppercase text-on-surface-variant">Book ${meta.book}</p>
        <h3 class="text-headline-md font-headline text-on-surface leading-tight">${esc(meta.title)}</h3>
        <p class="text-body-sm text-on-surface-variant mt-0.5 truncate">${esc(meta.subtitle)}</p>
      </div>
    </div>
    <div class="mt-4 flex flex-col gap-1.5">
      ${miniBar('Progress', progress, 'bg-primary-fixed-dim', 'text-on-surface-variant')}
      ${miniBar('Mastery', mastery, 'bg-mastery', 'text-mastery')}
    </div>
  </button>`;
}

export function render() {
  return `
  ${appHeader('VocabMaster')}
  <main class="pt-page pb-page px-5">
    <div class="flex flex-col gap-1 mt-1 mb-4">
      <h2 class="text-headline-lg font-headline text-on-surface">Your Library</h2>
      <p class="text-body-md text-on-surface-variant">Select a book to continue your vocabulary journey.</p>
    </div>
    <div data-body class="flex flex-col gap-4 stagger">
      <div class="flex justify-center py-10">${spinner()}</div>
    </div>
  </main>
  ${bottomNav('#/library')}`;
}

export function mount(root) {
  const body = root.querySelector('[data-body]');
  Promise.all([fetchPackProgress(), fetchPackCoverage()])
    .then(([progress, coverage]) => {
      // pack_coverage has no book column, so map pack → book via pack_progress
      // (which lists every pack with its book) to aggregate coverage per book.
      const bookByPack = new Map(progress.map((row) => [row.pack_id, row.book]));
      // Gold Mastery bar: mastered words over the book's total words.
      const bookMastery = (book) => {
        const r = progress.filter((row) => row.book === book);
        const total = r.reduce((s, row) => s + (row.word_count ?? 0), 0);
        const mastered = r.reduce((s, row) => s + (row.mastered ?? 0), 0);
        return total > 0 ? mastered / total : 0;
      };
      // Blue Progress bar: the 25/75 coverage formula over the book's packs.
      const bookProgress = (book) => {
        const r = coverage.filter((row) => bookByPack.get(row.pack_id) === book);
        return coverageRatio({
          word_count: r.reduce((s, row) => s + (row.word_count ?? 0), 0),
          reviewed: r.reduce((s, row) => s + Number(row.reviewed ?? 0), 0),
          practiced: r.reduce((s, row) => s + Number(row.practiced ?? 0), 0),
        });
      };
      body.innerHTML = BOOKS_META
        .map((meta) => bookCard(meta, bookProgress(meta.book), bookMastery(meta.book)))
        .join('');
    })
    .catch(() => {
      body.innerHTML = BOOKS_META.map((meta) => bookCard(meta, 0, 0)).join('');
    });
}
