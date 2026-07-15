import { fetchPackProgress } from '../api/queries.js';
import { BOOKS_META } from '../lib/models.js';
import { appHeader, bottomNav, esc, icon, progressBar, spinner } from '../ui.js';

const GRADIENTS = {
  1: ['#e1e0ff', '#c0c1ff'],
  2: ['#6cf8bb', '#4edea3'],
};

function bookCard(meta, progress) {
  const [from, to] = GRADIENTS[meta.book] ?? GRADIENTS[1];
  return `
  <button data-nav="#/book/${meta.book}" class="text-left bg-surface rounded-3xl overflow-hidden shadow-card active:scale-[0.98] transition-transform">
    <div class="h-36 flex items-center justify-center" style="background:linear-gradient(135deg, ${from}, ${to})">
      ${icon('menu_book', 'text-[56px]')}
    </div>
    <div class="p-4 flex flex-col gap-0.5">
      <h3 class="text-headline-sm font-headline text-on-surface">${esc(meta.title)}</h3>
      <p class="text-body-sm text-on-surface-variant">${esc(meta.subtitle)}</p>
    </div>
    <div class="border-t border-progress-track px-4 py-3 flex flex-col gap-1.5">
      <div class="flex justify-between">
        <span class="text-label-sm uppercase text-on-surface-variant">Progress</span>
        <span class="text-label-sm text-secondary">${Math.round(progress * 100)}%</span>
      </div>
      ${progressBar(progress)}
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
  fetchPackProgress()
    .then((rows) => {
      const bookProgress = (book) => {
        const r = rows.filter((row) => row.book === book);
        const total = r.reduce((s, row) => s + (row.word_count ?? 0), 0);
        const mastered = r.reduce((s, row) => s + (row.mastered ?? 0), 0);
        return total > 0 ? mastered / total : 0;
      };
      body.innerHTML = BOOKS_META.map((meta) => bookCard(meta, bookProgress(meta.book))).join('');
    })
    .catch(() => {
      body.innerHTML = BOOKS_META.map((meta) => bookCard(meta, 0)).join('');
    });
}
