// Revision session: words you've already seen, most-stale first, played through
// the shared MCQ engine. Scoped to one pack (#/revise/pack/:id) or a whole book
// (#/revise/book/:n).
//
// Ordering is the point — record_attempt() has been writing word_progress.
// next_due since day one and nothing ever read it, so words learned once and
// never revisited had no way of coming back around.
import { fetchPacks, fetchRevisionWords } from '../api/queries.js';
import { makeFillBlankItems } from '../lib/fillBlank.js';
import { newSeed } from '../lib/rng.js';
import { BOOKS_META } from '../lib/models.js';
import { emptyState, spinner, subHeader } from '../ui.js';
import { mountMcqSession } from './_mcq.js';

export function render() {
  return `
  ${subHeader('Revise')}
  <main class="pt-page flex flex-col" style="min-height:100dvh">
    <div data-body class="flex-1 flex flex-col">
      <div class="flex justify-center py-10">${spinner()}</div>
    </div>
  </main>`;
}

export function mount(root, scope, value) {
  const body = root.querySelector('[data-body]');
  const seed = newSeed();
  const isPack = scope === 'pack';
  const id = Number(value);

  const query = isPack ? { packId: id, limit: 20 } : { book: id, limit: 20 };

  Promise.all([fetchPacks(), fetchRevisionWords(query)])
    .then(([packs, words]) => {
      if (words.length === 0) {
        body.innerHTML = emptyState(
          'revise',
          'Nothing to revise yet',
          'Practise some words first — they’ll come\nback here when they’re due.',
        );
        return;
      }

      // Distractors come from the revision set itself, so every option is a word
      // the user has actually met.
      const packOf = new Map(words.map((w) => [w.id, w.pack_id]));
      // A book-scoped session spans packs, so each answer has to be logged
      // against its own pack rather than a single session-wide one.
      const items = makeFillBlankItems(words, seed).map((it) => ({
        ...it,
        packId: packOf.get(it.wordId) ?? null,
      }));
      if (items.length === 0) {
        body.innerHTML = emptyState(
          'revise',
          'Not enough words yet',
          'Revision needs a few more practised words\nto build questions from.',
        );
        return;
      }

      const label = isPack
        ? `Revision · Pack ${packs.find((p) => p.id === id)?.pack_number ?? ''}`.trim()
        : `Revision · ${BOOKS_META.find((b) => b.book === id)?.title ?? `Book ${id}`}`;

      mountMcqSession(body, {
        items,
        packId: isPack ? id : undefined,
        // Reuses the existing enum value rather than migrating exercise_type:
        // a revision session really is a mixed set, same as the AI coach's.
        exerciseType: 'ai_mixed',
        headerLabel: label,
      });
    })
    .catch(() => {
      body.innerHTML = `<p class="text-body-sm text-error text-center py-10">Couldn't load your revision words.</p>`;
    });
}
