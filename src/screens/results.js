import { navigate } from '../router.js';
import { fmtTime, icon, progressRing } from '../ui.js';
import { runPostSessionCelebrations } from '../lib/streakCelebration.js';
import { takeSessionSummary } from '../lib/sessionSummary.js';

// A graded exercise may hand off a { seconds, isBest } summary just before routing
// here; it's read once in mount() and rendered as a time chip.
let pendingSummary = null;

export function render(correct, total) {
  pendingSummary = takeSessionSummary();
  const c = Number(correct ?? 0);
  const t = Math.max(1, Number(total ?? 1));
  const ratio = c / t;
  const headline = ratio >= 0.9 ? 'Excellent!' : ratio >= 0.6 ? 'Well done!' : 'Keep practicing!';
  const timeChip = pendingSummary ? `
    <div class="flex items-center gap-2 bg-surface rounded-full px-4 py-2 shadow-card">
      ${icon('timer', 'text-primary text-[18px]')}
      <span class="font-mono text-body-md text-on-surface">${fmtTime(pendingSummary.seconds)}</span>
      ${pendingSummary.isBest ? '<span class="text-label-sm font-medium text-secondary">New best!</span>' : ''}
    </div>` : '';
  return `
  <div class="min-h-dvh bg-background flex flex-col items-center justify-center gap-5 px-5 text-center">
    ${progressRing({ progress: ratio, size: 140, stroke: 12 })}
    <h1 class="text-headline-lg font-headline text-on-surface">${headline}</h1>
    <p class="text-body-md text-on-surface-variant">You got ${c} of ${t} right this session.</p>
    ${timeChip}
    <button data-done class="mt-2 bg-primary text-on-primary rounded-full px-8 py-3.5 text-[16px] font-headline active:scale-[0.98] transition-transform">Done</button>
  </div>`;
}

export function mount(root) {
  root.querySelector('[data-done]').addEventListener('click', () => {
    if (history.length > 1) history.back();
    else navigate('#/library');
  });
  // If this session pushed today over its XP goal, or crossed a level, celebrate.
  runPostSessionCelebrations();
}
