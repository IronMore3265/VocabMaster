import { fetchPackWords, fetchPacks } from '../api/queries.js';
import { makeFillBlankItems } from '../lib/fillBlank.js';
import { newSeed } from '../lib/rng.js';
import { spinner, subHeader } from '../ui.js';
import { mountMcqSession } from './_mcq.js';

export function render() {
  return `
  ${subHeader('')}
  <main class="pt-page flex flex-col" style="min-height:100dvh">
    <div data-body class="flex-1 flex flex-col">
      <div class="flex justify-center py-10">${spinner()}</div>
    </div>
  </main>`;
}

export function mount(root, packId) {
  const id = Number(packId);
  const seed = newSeed();
  const body = root.querySelector('[data-body]');

  Promise.all([fetchPacks(), fetchPackWords(id)])
    .then(([packs, words]) => {
      const pack = packs.find((p) => p.id === id);
      const items = makeFillBlankItems(words, seed);
      if (!pack || items.length === 0) {
        body.innerHTML = `<p class="text-body-sm text-on-surface-variant text-center py-10">Not enough words to build this exercise.</p>`;
        return;
      }
      mountMcqSession(body, {
        items,
        packId: id,
        exerciseType: 'fill_blank',
        headerLabel: `Fill in the blanks · Pack ${pack.pack_number}`,
      });
    })
    .catch(() => {
      body.innerHTML = `<p class="text-body-sm text-error text-center py-10">Couldn't load words.</p>`;
    });
}
