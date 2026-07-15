// Shared MCQ player for fill-blank, syn-ant and AI definition questions.
// Renders into `container` and manages its own state: question card + options,
// answer reveal, record_attempt per answer, then navigates to the results route.
import { recordAttempt } from '../api/queries.js';
import { navigate } from '../router.js';
import { haptic } from '../lib/feedback.js';
import { esc, icon, progressBar } from '../ui.js';

const optionPalette = {
  correct: { box: 'bg-secondary-fixed border-secondary text-on-surface', ic: 'check_circle', icCls: 'text-secondary' },
  wrong: { box: 'bg-error-container border-error text-on-error-container', ic: 'cancel', icCls: 'text-error' },
  default: { box: 'bg-surface border-outline-variant text-on-surface', ic: null },
  dimmed: { box: 'bg-surface border-outline-variant text-on-surface-variant opacity-55', ic: null },
};

/**
 * @param {HTMLElement} container
 * @param {{items:Array, packId:number, exerciseType:string, headerLabel:string,
 *          onFinished?:(correct:number,total:number)=>void}} opts
 */
export function mountMcqSession(container, { items, packId, exerciseType, headerLabel, onFinished }) {
  let index = 0;
  let selectedId = null;
  let correctCount = 0;

  const draw = () => {
    const item = items[index];
    if (!item) return;
    const answered = selectedId !== null;
    const wasCorrect = selectedId === item.correctOptionId;

    const optionState = (id) => {
      if (!answered) return 'default';
      if (id === item.correctOptionId) return 'correct';
      if (id === selectedId) return 'wrong';
      return 'dimmed';
    };

    container.innerHTML = `
    <div class="flex-1 flex flex-col px-5 min-h-0">
      <div class="mt-2 flex flex-col gap-2">
        <div class="flex justify-between items-center">
          <span class="text-label-sm uppercase text-on-surface-variant">${esc(headerLabel)}</span>
          <span class="font-mono text-label-md text-primary">${index + 1} / ${items.length}</span>
        </div>
        ${progressBar((index + 1) / items.length)}
      </div>

      <div class="flex-1 overflow-y-auto py-4 flex flex-col gap-4">
        <div class="bg-surface rounded-3xl p-6 min-h-[120px] flex items-center shadow-card">
          <p class="text-body-lg text-on-surface">${esc(item.prompt)}</p>
        </div>

        <div class="flex flex-col gap-2.5" data-options>
          ${item.options.map((o) => {
            const st = optionPalette[optionState(o.id)];
            return `
            <button data-option="${esc(o.id)}" ${answered ? 'disabled' : ''}
              class="flex items-center gap-2.5 border-[1.5px] rounded-xl px-4 py-3.5 text-left transition-colors ${st.box}">
              <span class="flex-1 text-body-md">${esc(o.text)}</span>
              ${st.ic ? icon(st.ic, `${st.icCls} text-[20px]`) : ''}
            </button>`;
          }).join('')}
        </div>

        ${answered && item.explanation ? `
          <div class="bg-surface-container-low rounded-xl p-3.5 flex gap-2.5">
            ${icon(wasCorrect ? 'check_circle' : 'cancel', `${wasCorrect ? 'text-secondary' : 'text-error'} text-[20px] shrink-0 mt-0.5`)}
            <p class="text-body-sm text-on-surface-variant"><span class="font-medium text-on-surface">${esc(item.word)}:</span> ${esc(item.explanation)}</p>
          </div>` : ''}
      </div>

      ${answered ? `
        <button data-next class="mb-8 h-14 rounded-full bg-primary text-on-primary text-body-md font-medium flex items-center justify-center active:scale-[0.98] transition-transform">
          ${index === items.length - 1 ? 'Finish' : 'Next'}
        </button>` : '<div class="mb-8"></div>'}
    </div>`;

    if (!answered) {
      container.querySelectorAll('[data-option]').forEach((btn) => {
        btn.addEventListener('click', () => select(btn.getAttribute('data-option')));
      });
    } else {
      container.querySelector('[data-next]')?.addEventListener('click', next);
    }
  };

  const select = (optionId) => {
    if (selectedId !== null) return;
    const item = items[index];
    const correct = optionId === item.correctOptionId;
    correct ? haptic.success() : haptic.error();
    selectedId = optionId;
    if (correct) correctCount++;
    recordAttempt({
      wordId: item.wordId,
      packId: item.packId ?? packId,
      type: exerciseType,
      correct,
    });
    draw();
  };

  const next = () => {
    if (index === items.length - 1) {
      onFinished?.(correctCount, items.length);
      navigate(`#/results/${correctCount}/${items.length}`, { replace: true });
      return;
    }
    index++;
    selectedId = null;
    draw();
  };

  draw();
}
