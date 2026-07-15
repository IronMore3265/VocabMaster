import { fetchPackProgress } from '../api/queries.js';
import { BOOKS_META } from '../lib/models.js';
import { appHeader, bottomNav, esc, icon, progressBar, spinner } from '../ui.js';

// Categorical pastels from design_edit.md §3 (Lavender Purple, Sky Blue).
const GRADIENTS = {
  1: ['#e1d8fa', '#b794f4'],
  2: ['#a3ddf1', '#63b3ed'],
};

function bookCard(meta, progress) {
  const [from, to] = GRADIENTS[meta.book] ?? GRADIENTS[1];
  const pct = Math.round(progress * 100);
  return `
  <button data-nav="#/book/${meta.book}" class="text-left bg-surface rounded-3xl p-5 shadow-card active:scale-[0.98] transition-transform">
    <div class="flex items-start gap-4">
      <div class="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style="background:linear-gradient(135deg, ${from}, ${to})">
        ${icon('case_sensitive', 'text-[34px] text-[#1a202c]')}
      </div>
      <div class="flex-1 min-w-0 pt-0.5">
        <p class="text-label-sm uppercase text-on-surface-variant">Book ${meta.book}</p>
        <h3 class="text-headline-md font-headline text-on-surface leading-tight">${esc(meta.title)}</h3>
        <p class="text-body-sm text-on-surface-variant mt-0.5 truncate">${esc(meta.subtitle)}</p>
      </div>
      <span class="font-mono text-headline-sm text-primary shrink-0 pt-0.5">${pct}%</span>
    </div>
    <div class="mt-4 flex items-center gap-3">
      ${progressBar(progress, { className: 'flex-1' })}
      <span class="text-label-sm uppercase text-on-surface-variant shrink-0">Progress</span>
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
