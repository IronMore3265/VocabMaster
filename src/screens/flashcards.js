import { lookupWord } from '../api/dictionary.js';
import { fetchPackWords, fetchPacks, recordAttempt } from '../api/queries.js';
import { navigate } from '../router.js';
import { haptic, playAudio } from '../lib/feedback.js';
import { runPostSessionCelebrations } from '../lib/streakCelebration.js';
import { posLabel } from '../lib/models.js';
import { esc, icon, progressBar, setProgress, spinner, subHeader } from '../ui.js';

export function render() {
  return `
  ${subHeader('')}
  <main class="pt-page px-5 flex flex-col" style="height:100dvh;overflow:hidden">
    <div data-body class="flex-1 min-h-0 flex flex-col">
      <div class="flex justify-center py-10">${spinner()}</div>
    </div>
  </main>`;
}

// Compact height of the card while it shows the word.
const BASE_HEIGHT = 380;

export function mount(root, packId) {
  const id = Number(packId);
  const body = root.querySelector('[data-body]');
  const audioCache = new Map();
  let pack = null;
  let words = [];
  let index = 0;
  let flipped = false;
  // Flashcards are pure review: each card is logged once, the first time it's
  // reached, so a full pass fills the pack's Progress bar (there's no right/wrong).
  const seen = new Set();
  // Frame elements, resolved once drawFrame() has run.
  let els = null;

  const recordSeen = (i) => {
    if (seen.has(i)) return;
    seen.add(i);
    recordAttempt({ wordId: words[i].id, packId: id, type: 'flashcard', correct: true });
  };

  Promise.all([fetchPacks(), fetchPackWords(id)])
    .then(([packs, w]) => {
      pack = packs.find((p) => p.id === id);
      words = w;
      if (!pack || words.length === 0) {
        body.innerHTML = `<p class="text-body-sm text-on-surface-variant text-center py-10">No words in this pack.</p>`;
        return;
      }
      drawFrame();
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

  function pillRow(label, items, tone) {
    if (!items?.length) return '';
    return `
    <div class="flex flex-col gap-1.5">
      <span class="text-label-sm uppercase text-on-surface-variant">${label}</span>
      <div class="flex flex-wrap gap-1.5">
        ${items.map((w) => `<span class="rounded-full ${tone} px-3 py-1 text-body-sm">${esc(w)}</span>`).join('')}
      </div>
    </div>`;
  }

  // The frame (header, progress, card shell, controls) is built once and reused.
  // Rebuilding it per word restarted the progress bar's entry animation and
  // re-bound every listener on each tap.
  function drawFrame() {
    body.innerHTML = `
    <div class="flex flex-col gap-2 mt-1 shrink-0">
      <div class="flex justify-between items-center">
        <span class="text-label-sm uppercase text-on-surface-variant">Pack ${pack.pack_number}: ${esc(pack.first_word.toUpperCase())} – ${esc(pack.last_word.toUpperCase())}</span>
        <span data-counter class="font-mono text-label-md text-primary"></span>
      </div>
      <div data-progress>${progressBar(1 / words.length)}</div>
    </div>

    <div data-scene-wrap class="flex-1 min-h-0 mt-4">
      <div class="flip-scene" data-scene>
      <div class="flip-inner" data-flip>
        <div class="flip-face bg-surface rounded-3xl p-6 shadow-card flex flex-col">
          <div class="flex justify-end">
            <button data-speak class="p-1 text-on-surface-variant active:opacity-70">${icon('volume_up', 'text-[26px]')}</button>
          </div>
          <div class="flex-1 flex flex-col items-center justify-center gap-2.5 min-h-0" data-front></div>
          <div class="flex justify-center items-center gap-2">
            ${icon('touch_app', 'text-outline text-[18px]')}
            <span class="text-label-sm uppercase text-outline">Tap to flip</span>
          </div>
        </div>
        <div class="flip-face flip-back bg-surface rounded-3xl shadow-card overflow-hidden">
          <div data-back-scroll class="h-full overflow-y-auto p-6">
            <div class="flex flex-col gap-3.5" data-back-content></div>
          </div>
          <div data-scroll-hint class="hidden pointer-events-none absolute left-0 right-0 bottom-0 h-10 rounded-b-3xl scroll-hint"></div>
        </div>
      </div>
      </div>
    </div>

    <div data-controls class="shrink-0 pt-4 pb-safe mb-4"></div>`;

    els = {
      counter: body.querySelector('[data-counter]'),
      progress: body.querySelector('[data-progress]'),
      sceneWrap: body.querySelector('[data-scene-wrap]'),
      scene: body.querySelector('[data-scene]'),
      flip: body.querySelector('[data-flip]'),
      front: body.querySelector('[data-front]'),
      backScroll: body.querySelector('[data-back-scroll]'),
      backContent: body.querySelector('[data-back-content]'),
      scrollHint: body.querySelector('[data-scroll-hint]'),
      controls: body.querySelector('[data-controls]'),
    };

    els.flip.addEventListener('click', (e) => {
      if (e.target.closest('[data-speak]')) return;
      toggleFlip();
    });
    body.querySelector('[data-speak]').addEventListener('click', () => speak(words[index].word));
  }

  function drawWord() {
    const word = words[index];
    const examples = (word.example_sentences ?? []).slice(0, 3);

    recordSeen(index);
    els.counter.textContent = `${index + 1} / ${words.length}`;
    setProgress(els.progress, (index + 1) / words.length);

    els.front.innerHTML = `
      <span class="text-[34px] leading-[42px] font-headline text-primary text-center">${esc(word.word)}</span>
      ${word.pronunciation ? `<span class="text-body-lg text-on-surface-variant">${esc(word.pronunciation)}</span>` : ''}`;

    els.backContent.innerHTML = `
      <span class="self-start bg-primary-fixed text-on-primary-fixed rounded-full px-3 py-1 text-label-sm uppercase">${esc(posLabel(word.part_of_speech))}</span>
      <p class="text-body-lg text-on-surface">${esc(word.definition ?? '')}</p>
      ${examples.length ? `
        <div class="flex flex-col gap-1.5">
          <span class="text-label-sm uppercase text-on-surface-variant">Example${examples.length > 1 ? 's' : ''}</span>
          <div class="flex flex-col gap-2">
            ${examples.map((ex) => `<div class="bg-surface-container-low rounded-xl p-3.5"><p class="text-body-md text-on-surface-variant italic">${esc(ex)}</p></div>`).join('')}
          </div>
        </div>` : ''}
      ${pillRow('Synonyms', word.synonyms, 'bg-secondary-container text-on-secondary-container')}
      ${pillRow('Antonyms', word.antonyms, 'bg-error-container text-on-error-container')}
      ${word.notes ? `<div class="bg-surface-container-low rounded-xl p-3.5"><p class="text-body-sm text-on-surface-variant">${esc(word.notes)}</p></div>` : ''}`;

    els.backScroll.scrollTop = 0;
    setFlipped(false);
    drawControls();
  }

  function setFlipped(next) {
    flipped = next;
    els.flip.classList.toggle('is-flipped', flipped);
    resizeScene();
  }

  function toggleFlip() {
    setFlipped(!flipped);
    drawControls();
  }

  // Compact while showing the word; grows on flip to fit the details.
  //
  // The cap is the wrapper's own laid-out height — the space actually left over
  // after the header, progress bar and controls have taken theirs. The old
  // version guessed at `window.innerHeight - 220`, which undercounted the chrome
  // and disagreed with 100dvh in the Android WebView, so the card outgrew the
  // screen and pushed the buttons off. Measuring the container instead means the
  // card physically cannot overflow, whatever the viewport does.
  function resizeScene() {
    if (!els) return;
    const avail = els.sceneWrap.clientHeight;
    if (!avail) return; // not laid out yet
    let target = Math.min(BASE_HEIGHT, avail);
    let overflows = false;
    if (flipped) {
      const needed = els.backContent.scrollHeight + 48; // p-6 top + bottom
      target = Math.min(Math.max(BASE_HEIGHT, needed), avail);
      overflows = needed > target + 4; // the rest is a scroll away
    }
    els.scene.style.height = `${target}px`;
    // Derived from the target, not measured after: mid-transition the element
    // still reports its old height.
    els.scrollHint.classList.toggle('hidden', !overflows);
  }

  // No right/wrong grading — just navigation. When flipped, the primary button
  // advances (or finishes on the last card); when facing the word, it flips.
  function drawControls() {
    const el = els.controls;
    const round = `w-14 h-14 rounded-full bg-surface shadow-card flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40`;
    const isLast = index === words.length - 1;
    const mid = flipped
      ? (isLast
        ? `${icon('check', 'text-[22px]')}<span class="text-[16px] font-headline">Finish</span>`
        : `${icon('arrow_forward', 'text-[22px]')}<span class="text-[16px] font-headline">Next</span>`)
      : `${icon('flip', 'text-[22px]')}<span class="text-[16px] font-headline">Flip Card</span>`;
    el.innerHTML = `
      <div class="flex items-center justify-center gap-4">
        <button data-prev class="${round}" ${index === 0 ? 'disabled' : ''}>${icon('arrow_back', 'text-[24px] text-on-surface')}</button>
        <button data-mid class="flex-1 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
          ${mid}
        </button>
        <button data-next class="${round}" ${isLast ? 'disabled' : ''}>${icon('arrow_forward', 'text-[24px] text-on-surface')}</button>
      </div>`;
    el.querySelector('[data-mid]').addEventListener('click', () => {
      if (!flipped) toggleFlip();
      else if (isLast) finish();
      else go(1);
    });
    el.querySelector('[data-prev]').addEventListener('click', () => go(-1));
    el.querySelector('[data-next]').addEventListener('click', () => go(1));
  }

  function go(delta) {
    const next = Math.min(words.length - 1, Math.max(0, index + delta));
    if (next === index) return;
    index = next;
    drawWord();
  }

  function finish() {
    haptic.success();
    const n = words.length;
    body.innerHTML = `
      <div class="flex-1 flex flex-col items-center justify-center gap-5 text-center px-4">
        <div class="w-24 h-24 rounded-full bg-primary-fixed flex items-center justify-center">
          ${icon('style', 'text-primary text-[44px]')}
        </div>
        <h1 class="text-headline-lg font-headline text-on-surface">Nice reviewing!</h1>
        <p class="text-body-md text-on-surface-variant">You reviewed ${n} word${n === 1 ? '' : 's'} in this pack.</p>
        <button data-done class="mt-2 bg-primary text-on-primary rounded-full px-8 py-3.5 text-[16px] font-headline active:scale-[0.98] transition-transform">Done</button>
      </div>`;
    body.querySelector('[data-done]').addEventListener('click', () => {
      if (history.length > 1) history.back();
      else navigate('#/library');
    });
    // A full review can push today over its XP goal or across a level.
    runPostSessionCelebrations();
  }

  // Rotating the device changes how much room the card has to grow into.
  const onResize = () => resizeScene();
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}
