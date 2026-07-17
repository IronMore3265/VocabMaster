// Pull-to-refresh for list screens (Friends, Compare). The one manual-refresh
// affordance — a separate button would be redundant. WebView-safe: it only
// engages when the page is scrolled to the very top, and only takes over the
// gesture once the drag is clearly downward, so normal scrolling is untouched.
import { spinner } from '../ui.js';

const THRESHOLD = 72; // px pulled before a release triggers a refresh
const MAX = 96; // px the indicator can travel

/**
 * @param {() => Promise<void>} onRefresh  runs on a qualifying pull.
 * @returns {() => void} cleanup — call from the screen's mount teardown.
 */
export function attachPullToRefresh(onRefresh) {
  const ind = document.createElement('div');
  ind.className = 'fixed top-0 left-0 w-full flex justify-center z-30 pointer-events-none';
  ind.style.transform = 'translateY(-48px)';
  ind.style.opacity = '0';
  ind.innerHTML = `<div class="mt-[calc(env(safe-area-inset-top)+56px)] w-9 h-9 rounded-full bg-surface shadow-card flex items-center justify-center">${spinner()}</div>`;
  document.body.appendChild(ind);

  let startY = null;
  let pulling = false;
  let busy = false;

  const setInd = (dist) => {
    const clamped = Math.min(MAX, dist);
    ind.style.transition = startY === null ? 'transform 0.2s ease, opacity 0.2s ease' : 'none';
    ind.style.transform = `translateY(${clamped - 48}px)`;
    ind.style.opacity = String(Math.min(1, clamped / THRESHOLD));
  };

  const onStart = (e) => {
    if (busy || window.scrollY > 0) return;
    startY = e.touches[0].clientY;
    pulling = false;
  };
  const onMove = (e) => {
    if (startY === null || busy) return;
    const dy = e.touches[0].clientY - startY;
    if (dy <= 0) { startY = null; return; }
    if (window.scrollY > 0) { startY = null; setInd(0); return; }
    if (!pulling && dy > 6) pulling = true;
    if (pulling) {
      e.preventDefault(); // take over the gesture from native scroll
      setInd(dy * 0.5);
    }
  };
  const onEnd = async (e) => {
    if (startY === null) return;
    const dy = (e.changedTouches[0]?.clientY ?? 0) - startY;
    const trigger = pulling && dy * 0.5 >= THRESHOLD;
    startY = null;
    pulling = false;
    if (!trigger) { setInd(0); return; }
    busy = true;
    setInd(THRESHOLD);
    try { await onRefresh(); } catch { /* screen shows its own error */ }
    busy = false;
    setInd(0);
  };

  document.addEventListener('touchstart', onStart, { passive: true });
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onEnd, { passive: true });
  document.addEventListener('touchcancel', onEnd, { passive: true });

  return () => {
    document.removeEventListener('touchstart', onStart);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onEnd);
    document.removeEventListener('touchcancel', onEnd);
    ind.remove();
  };
}
