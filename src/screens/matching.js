import { fetchPackWords, fetchPacks, recordAttempt } from '../api/queries.js';
import { navigate } from '../router.js';
import { haptic } from '../lib/feedback.js';
import { makeMatchingRounds } from '../lib/matching.js';
import { mulberry32, newSeed, shuffle } from '../lib/rng.js';
import { setBestTimeIfBetter } from '../store.js';
import { clearLeaveGuard, setLeaveGuard } from '../lib/leaveGuard.js';
import { setSessionSummary } from '../lib/sessionSummary.js';
import {
  confirmSheet, esc, progressBar, spinner, startStopwatch, stopwatchChip, subHeader,
} from '../ui.js';

export function render() {
  // The stopwatch lives in the header so it survives each round's body redraw.
  return `
  ${subHeader('', stopwatchChip())}
  <main class="pt-page pb-page-sub px-5">
    <div data-body>
      <div class="flex justify-center py-10">${spinner()}</div>
    </div>
  </main>`;
}

export function mount(root, packId) {
  const id = Number(packId);
  const seed = newSeed();
  const body = root.querySelector('[data-body]');

  let pack = null;
  let rounds = [];
  let totalPairs = 0;
  let roundIndex = 0;
  let selectedWord = null;
  let matched = new Set();
  let missed = new Set();
  let firstTryCorrect = 0;
  let pairsDone = 0;

  const timer = startStopwatch(root);
  const cleanup = () => { timer?.destroy(); clearLeaveGuard(); };
  setLeaveGuard(() => confirmSheet({
    title: 'Leave exercise?',
    message: 'Your progress in this session will be lost.',
    confirmLabel: 'Leave',
    onConfirm: () => { cleanup(); history.back(); },
  }));

  Promise.all([fetchPacks(), fetchPackWords(id)])
    .then(([packs, words]) => {
      pack = packs.find((p) => p.id === id);
      rounds = makeMatchingRounds(words, seed);
      totalPairs = rounds.reduce((s, r) => s + r.pairs.length, 0);
      if (!pack || rounds.length === 0) {
        body.innerHTML = `<p class="text-body-sm text-on-surface-variant text-center py-10">Not enough words to build a matching round.</p>`;
        return;
      }
      draw();
    })
    .catch(() => {
      body.innerHTML = `<p class="text-body-sm text-error text-center py-10">Couldn't load words.</p>`;
    });

  function draw() {
    const round = rounds[roundIndex];
    const matches = shuffle(round.pairs, mulberry32(seed + roundIndex + 1));
    body.innerHTML = `
    <div class="flex flex-col gap-2 mt-1">
      <div class="flex justify-between items-center">
        <span class="text-label-sm uppercase text-on-surface-variant">Matching · Round ${roundIndex + 1} / ${rounds.length}</span>
        <span class="font-mono text-label-md text-primary">${pairsDone} / ${totalPairs}</span>
      </div>
      ${progressBar(totalPairs ? pairsDone / totalPairs : 0)}
    </div>
    <p class="text-body-sm text-on-surface-variant mt-4 mb-3">Tap a word, then tap its meaning.</p>
    <div class="flex gap-3">
      <div class="flex-[2] flex flex-col gap-2.5" data-words>
        ${round.pairs.map((pair) => wordBtn(pair)).join('')}
      </div>
      <div class="flex-[3] flex flex-col gap-2.5" data-defs>
        ${matches.map((pair) => defBtn(pair)).join('')}
      </div>
    </div>`;

    body.querySelectorAll('[data-word]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const wid = Number(btn.getAttribute('data-word'));
        if (matched.has(wid)) return;
        selectedWord = selectedWord === wid ? null : wid;
        refreshStyles();
      });
    });
    body.querySelectorAll('[data-def]').forEach((btn) => {
      btn.addEventListener('click', () => tapDefinition(Number(btn.getAttribute('data-def')), btn));
    });
    refreshStyles();
  }

  function wordBtn(pair) {
    return `<button data-word="${pair.wordId}" class="border-[1.5px] rounded-xl px-3 py-3.5 text-left transition-colors">
      <span class="text-body-md font-medium">${esc(pair.word)}</span>
    </button>`;
  }
  function defBtn(pair) {
    return `<button data-def="${pair.wordId}" class="rounded-xl p-3 text-left shadow-card bg-surface transition-colors">
      <span class="text-body-sm text-on-surface-variant">${esc(pair.match)}</span>
    </button>`;
  }

  function refreshStyles() {
    body.querySelectorAll('[data-word]').forEach((btn) => {
      const wid = Number(btn.getAttribute('data-word'));
      const isMatched = matched.has(wid);
      const isSelected = selectedWord === wid;
      btn.className = `border-[1.5px] rounded-xl px-3 py-3.5 text-left transition-colors ${
        isMatched ? 'border-secondary bg-secondary-container opacity-60'
        : isSelected ? 'border-primary bg-primary-fixed' : 'border-outline-variant bg-surface'
      }`;
      btn.querySelector('span').className = `text-body-md font-medium ${
        isMatched ? 'text-on-secondary-container' : isSelected ? 'text-on-primary-fixed' : 'text-on-surface'
      }`;
      btn.disabled = isMatched;
    });
    body.querySelectorAll('[data-def]').forEach((btn) => {
      const wid = Number(btn.getAttribute('data-def'));
      const isMatched = matched.has(wid);
      btn.className = `rounded-xl p-3 text-left shadow-card border-[1.5px] transition-colors ${
        isMatched ? 'bg-secondary-container border-secondary opacity-60' : 'bg-surface border-transparent'
      }`;
      btn.querySelector('span').className = `text-body-sm ${isMatched ? 'text-on-secondary-container' : 'text-on-surface-variant'}`;
      btn.disabled = isMatched || selectedWord === null;
    });
  }

  function tapDefinition(defWordId, btn) {
    if (selectedWord === null || matched.has(defWordId)) return;
    const round = rounds[roundIndex];
    if (defWordId === selectedWord) {
      const firstTry = !missed.has(selectedWord);
      haptic.success();
      recordAttempt({ wordId: selectedWord, packId: id, type: 'matching', correct: firstTry });
      matched.add(selectedWord);
      if (firstTry) firstTryCorrect++;
      pairsDone++;
      selectedWord = null;
      // update header counts
      const counter = body.querySelector('.font-mono');
      if (counter) counter.textContent = `${pairsDone} / ${totalPairs}`;
      const bar = body.querySelector('.grow-x');
      if (bar) bar.style.width = `${(totalPairs ? pairsDone / totalPairs : 0) * 100}%`;
      refreshStyles();

      if (matched.size === round.pairs.length) {
        if (roundIndex === rounds.length - 1) {
          const seconds = Math.round(timer.elapsed());
          const isBest = setBestTimeIfBetter(id, 'matching', seconds);
          setSessionSummary({ seconds, isBest });
          cleanup();
          navigate(`#/results/${firstTryCorrect}/${totalPairs}`, { replace: true });
          return;
        }
        setTimeout(() => {
          roundIndex++;
          matched = new Set();
          missed = new Set();
          draw();
        }, 350);
      }
    } else {
      // Wrong pairing: flash the tapped meaning red, then restore. Setting the
      // full className (not just adding one) avoids the bg-surface/bg-error
      // collision that used to swallow the feedback entirely.
      haptic.error();
      missed.add(selectedWord);
      btn.className = 'rounded-xl p-3 text-left shadow-card border-[1.5px] border-error bg-error-container transition-colors';
      btn.querySelector('span').className = 'text-body-sm text-on-error-container';
      setTimeout(() => { if (!matched.has(defWordId)) refreshStyles(); }, 500);
    }
  }

  return () => cleanup();
}
