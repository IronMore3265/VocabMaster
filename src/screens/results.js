import { navigate } from '../router.js';
import { progressRing } from '../ui.js';

export function render(correct, total) {
  const c = Number(correct ?? 0);
  const t = Math.max(1, Number(total ?? 1));
  const ratio = c / t;
  const headline = ratio >= 0.9 ? 'Excellent!' : ratio >= 0.6 ? 'Well done!' : 'Keep practicing!';
  return `
  <div class="min-h-dvh bg-background flex flex-col items-center justify-center gap-5 px-5 text-center">
    ${progressRing({ progress: ratio, size: 140, stroke: 12 })}
    <h1 class="text-headline-lg font-headline text-on-surface">${headline}</h1>
    <p class="text-body-md text-on-surface-variant">You got ${c} of ${t} right this session.</p>
    <button data-done class="mt-2 bg-primary text-on-primary rounded-full px-8 py-3.5 text-[16px] font-headline active:scale-[0.98] transition-transform">Done</button>
  </div>`;
}

export function mount(root) {
  root.querySelector('[data-done]').addEventListener('click', () => {
    if (history.length > 1) history.back();
    else navigate('#/library');
  });
}
