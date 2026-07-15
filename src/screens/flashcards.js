import { lookupWord } from '../api/dictionary.js';
import { fetchPackWords, fetchPacks, recordAttempt } from '../api/queries.js';
import { navigate } from '../router.js';
import { haptic, playAudio } from '../lib/feedback.js';
import { posLabel } from '../lib/models.js';
import { esc, icon, progressBar, spinner, subHeader } from '../ui.js';

export function render() {
  return `
  ${subHeader('')}
  <main class="pt-page px-5 flex flex-col" style="min-height:100dvh">
    <div data-body class="flex-1 flex flex-col">
      <div class="flex justify-center py-10">${spinner()}</div>
    </div>
  </main>`;
}

export function mount(root, packId) {
  const id = Number(packId);
  const body = root.querySelector('[data-body]');
  const audioCache = new Map();
  let pack = null;
  let words = [];
  let index = 0;
  let flipped = false;
  let correctCount = 0;

  Promise.all([fetchPacks(), fetchPackWords(id)])
    .then(([packs, w]) => {
      pack = packs.find((p) => p.id === id);
      words = w;
      if (!pack || words.length === 0) {
        body.innerHTML = `<p class="text-body-sm text-on-surface-variant text-center py-10">No words in this pack.</p>`;
        return;
      }
      drawWord();
    })
    .catch(() => {
      body.innerHTML = `<p class="text-body-sm text-error text-center py-10">Couldn't load words.</p>`;
    });

  const speak = async (headword) => {
    let url = audioCache.get(headword);
    if (url === undefined) {
      try {
        const payload = await lookupWord(headword);
        url = payload.entries?.find((e) => e.audioUrl)?.audioUrl ?? null;
      } catch { url = null; }
      audioCache.set(headword, url);
    }
    if (url) playAudio(url);
  };

  function pillRow(label, items) {
    if (!items?.length) return '';
    return `
    <div class="flex flex-col gap-1.5">
      <span class="text-label-sm uppercase text-on-surface-variant">${label}</span>
      <div class="flex flex-wrap gap-1.5">
        ${items.map((w) => `<span class="rounded-full bg-surface-container text-on-surface px-3 py-1 text-body-sm">${esc(w)}</span>`).join('')}
      </div>
    </div>`;
  }

  function drawWord() {
    const word = words[index];
    const examples = (word.example_sentences ?? []).slice(0, 3);
    body.innerHTML = `
    <div class="flex flex-col gap-2 mt-1">
      <div class="flex justify-between items-center">
        <span class="text-label-sm uppercase text-on-surface-variant">Pack ${pack.pack_number}: ${esc(pack.first_word.toUpperCase())} – ${esc(pack.last_word.toUpperCase())}</span>
        <span class="font-mono text-label-md text-primary">${index + 1} / ${words.length}</span>
      </div>
      ${progressBar((index + 1) / words.length)}
    </div>

    <div class="flip-scene mt-4" style="height:380px">
      <div class="flip-inner" data-flip>
        <div class="flip-face bg-surface rounded-3xl p-6 shadow-card flex flex-col">
          <div class="flex justify-end">
            <button data-speak class="p-1 text-on-surface-variant active:opacity-70">${icon('volume_up', 'text-[26px]')}</button>
          </div>
          <div class="flex-1 flex flex-col items-center justify-center gap-2.5">
            <span class="text-[34px] leading-[42px] font-headline text-primary">${esc(word.word)}</span>
            ${word.pronunciation ? `<span class="text-body-lg text-on-surface-variant">${esc(word.pronunciation)}</span>` : ''}
          </div>
          <div class="flex justify-center items-center gap-2">
            ${icon('touch_app', 'text-outline text-[18px]')}
            <span class="text-label-sm uppercase text-outline">Tap to flip</span>
          </div>
        </div>
        <div class="flip-face flip-back bg-surface rounded-3xl p-6 shadow-card overflow-y-auto">
          <div class="flex flex-col gap-3.5">
            <span class="self-start bg-primary-fixed text-on-primary-fixed rounded-full px-3 py-1 text-label-sm uppercase">${esc(posLabel(word.part_of_speech))}</span>
            <p class="text-body-lg text-on-surface">${esc(word.definition ?? '')}</p>
            ${examples.length ? `
              <div class="flex flex-col gap-1.5">
                <span class="text-label-sm uppercase text-on-surface-variant">Example${examples.length > 1 ? 's' : ''}</span>
                <div class="flex flex-col gap-2">
                  ${examples.map((ex) => `<div class="bg-surface-container-low rounded-xl p-3.5"><p class="text-body-md text-on-surface-variant italic">${esc(ex)}</p></div>`).join('')}
                </div>
              </div>` : ''}
            ${pillRow('Synonyms', word.synonyms)}
            ${pillRow('Antonyms', word.antonyms)}
            ${word.notes ? `<div class="bg-surface-container-low rounded-xl p-3.5"><p class="text-body-sm text-on-surface-variant">${esc(word.notes)}</p></div>` : ''}
          </div>
        </div>
      </div>
    </div>

    <div data-controls class="mt-auto mb-8 pt-4"></div>`;

    flipped = false;
    body.querySelector('[data-flip]').addEventListener('click', (e) => {
      if (e.target.closest('[data-speak]')) return;
      toggleFlip();
    });
    body.querySelector('[data-speak]').addEventListener('click', () => speak(word.word));
    drawControls();
  }

  function toggleFlip() {
    flipped = !flipped;
    body.querySelector('[data-flip]').classList.toggle('is-flipped', flipped);
    drawControls();
  }

  function drawControls() {
    const el = body.querySelector('[data-controls]');
    const round = `w-14 h-14 rounded-full bg-surface shadow-card flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40`;
    if (flipped) {
      el.innerHTML = `
      <div class="grid grid-cols-2 gap-4">
        <button data-again class="h-14 rounded-full bg-error-container text-on-error-container flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
          ${icon('replay', 'text-[22px]')}<span class="text-[16px] font-headline">Again</span>
        </button>
        <button data-got class="h-14 rounded-full bg-secondary text-on-secondary flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
          ${icon('check', 'text-[22px]')}<span class="text-[16px] font-headline">Got it</span>
        </button>
      </div>`;
      el.querySelector('[data-again]').addEventListener('click', () => advance(false));
      el.querySelector('[data-got]').addEventListener('click', () => advance(true));
    } else {
      el.innerHTML = `
      <div class="flex items-center justify-center gap-4">
        <button data-prev class="${round}" ${index === 0 ? 'disabled' : ''}>${icon('arrow_back', 'text-[24px] text-on-surface')}</button>
        <button data-flipbtn class="flex-1 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
          ${icon('flip', 'text-[22px]')}<span class="text-[16px] font-headline">Flip Card</span>
        </button>
        <button data-next class="${round}" ${index === words.length - 1 ? 'disabled' : ''}>${icon('arrow_forward', 'text-[24px] text-on-surface')}</button>
      </div>`;
      el.querySelector('[data-flipbtn]').addEventListener('click', toggleFlip);
      el.querySelector('[data-prev]').addEventListener('click', () => go(-1));
      el.querySelector('[data-next]').addEventListener('click', () => go(1));
    }
  }

  function go(delta) {
    const next = Math.min(words.length - 1, Math.max(0, index + delta));
    if (next === index) return;
    index = next;
    drawWord();
  }

  function advance(gotIt) {
    gotIt ? haptic.light() : haptic.medium();
    recordAttempt({ wordId: words[index].id, packId: id, type: 'flashcard', correct: gotIt });
    if (gotIt) correctCount++;
    if (index === words.length - 1) {
      navigate(`#/results/${correctCount}/${words.length}`, { replace: true });
      return;
    }
    index++;
    drawWord();
  }
}
