import { fetchPackProgress, fetchPackRevision, fetchPacks, progressRatio } from '../api/queries.js';
import { BOOKS_META, packTitle } from '../lib/models.js';
import { esc, icon, progressBar, reviseCard, spinner, subHeader } from '../ui.js';

function packCard(pack, progress) {
  return `
  <button data-nav="#/pack/${pack.id}" class="text-left bg-surface rounded-2xl p-4 flex flex-col gap-3 shadow-card active:scale-[0.98] transition-transform">
    <div class="flex items-center gap-3">
      <div class="w-11 h-11 rounded-full bg-primary-fixed flex items-center justify-center shrink-0">
        ${icon('book_2', 'text-primary text-[22px]')}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-[16px] leading-[22px] font-headline text-on-surface truncate">${esc(packTitle(pack))}</p>
        <p class="text-label-sm uppercase text-on-surface-variant">${pack.word_count} words</p>
      </div>
      ${icon('chevron_right', 'text-outline')}
    </div>
    <div class="flex items-center gap-2.5">
      ${progressBar(progress, { height: 6 })}
      <span class="text-label-sm text-on-surface-variant">${Math.round(progress * 100)}%</span>
    </div>
  </button>`;
}

export function render(book) {
  const bookNumber = Number(book) === 2 ? 2 : 1;
  const meta = BOOKS_META.find((b) => b.book === bookNumber);
  return `
  ${subHeader(meta.title)}
  <main class="pt-page pb-page-sub px-5">
    <div class="flex flex-col gap-1 mt-1 mb-4" data-heading>
      <h2 class="text-headline-lg font-headline text-on-surface">${esc(meta.title)}</h2>
      <p class="text-body-md text-on-surface-variant">${esc(meta.subtitle)}</p>
    </div>
    <div data-revise class="empty:hidden mb-4"></div>
    <div data-body class="flex flex-col gap-3 stagger">
      <div class="flex justify-center py-10">${spinner()}</div>
    </div>
  </main>`;
}

export function mount(root, book) {
  const bookNumber = Number(book) === 2 ? 2 : 1;
  const meta = BOOKS_META.find((b) => b.book === bookNumber);
  const body = root.querySelector('[data-body]');
  const heading = root.querySelector('[data-heading] p');
  const reviseEl = root.querySelector('[data-revise]');

  Promise.all([
    fetchPacks(),
    fetchPackProgress().catch(() => []),
    fetchPackRevision().catch(() => []),
  ])
    .then(([packs, progress, revision]) => {
      const list = packs.filter((p) => p.book === bookNumber);
      const byPack = new Map(progress.map((row) => [row.pack_id, row]));
      const totalWords = list.reduce((s, p) => s + p.word_count, 0);
      heading.textContent = `${meta.subtitle} · ${totalWords} words in ${list.length} packs`;

      // Revising a book covers everything practised in it so far, across packs.
      const forBook = revision.filter((r) => r.book === bookNumber);
      reviseEl.innerHTML = reviseCard(`#/revise/book/${bookNumber}`, {
        seen: forBook.reduce((s, r) => s + Number(r.seen ?? 0), 0),
        due: forBook.reduce((s, r) => s + Number(r.due ?? 0), 0),
      });

      body.innerHTML = list.map((p) => packCard(p, progressRatio(byPack.get(p.id)))).join('');
    })
    .catch(() => {
      body.innerHTML = `<p class="text-body-sm text-error text-center py-10">Couldn't load packs. Check your connection.</p>`;
    });
}
