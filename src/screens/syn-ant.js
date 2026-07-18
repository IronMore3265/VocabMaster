import { fetchPackWords, fetchPacks } from '../api/queries.js';
import { newSeed } from '../lib/rng.js';
import { makeSynAntItems } from '../lib/synAnt.js';
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
  let session = null;

  Promise.all([fetchPacks(), fetchPackWords(id)])
    .then(([packs, words]) => {
      const pack = packs.find((p) => p.id === id);
      const items = makeSynAntItems(words, seed);
      if (!pack || items.length === 0) {
        body.innerHTML = `<p class="text-body-sm text-on-surface-variant text-center py-10">Not enough words to build this exercise.</p>`;
        return;
      }
      session = mountMcqSession(body, {
        items,
        packId: id,
        exerciseType: 'syn_ant',
        headerLabel: `Synonym / Antonym · Pack ${pack.pack_number}`,
        trackTime: true,
      });
    })
    .catch(() => {
      body.innerHTML = `<p class="text-body-sm text-error text-center py-10">Couldn't load words.</p>`;
    });

  return () => session?.destroy();
}
