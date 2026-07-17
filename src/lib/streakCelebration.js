// Full-screen fire when a day first clears its XP goal and extends the streak —
// the Duolingo moment. All motion is CSS (see .streak-* in style.css), so the
// global prefers-reduced-motion rule flattens it. Resolves when dismissed.
import { icon } from '../ui.js';
import { haptic } from './feedback.js';
import {
  dailyXp, fetchAttemptEvents, fetchStreakState, invalidate, localDayKey,
} from '../api/queries.js';
import { getSettings, getStreakCelebratedDay, setStreakCelebratedDay } from '../store.js';

const REDUCE = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// A ring of tapering rays behind the flame.
function rays() {
  const spokes = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    const x1 = 150 + Math.cos(a) * 46;
    const y1 = 150 + Math.sin(a) * 46;
    const x2 = 150 + Math.cos(a) * 130;
    const y2 = 150 + Math.sin(a) * 130;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
      stroke="var(--color-flame-dim)" stroke-width="8" stroke-linecap="round" opacity="0.55"/>`;
  }).join('');
  return `<svg class="streak-rays absolute" width="300" height="300" viewBox="0 0 300 300" aria-hidden="true">${spokes}</svg>`;
}

export function showStreakCelebration({ streak = 1 } = {}) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'streak-cel fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 px-8 text-center';
    wrap.style.background = 'radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--color-flame) 22%, var(--color-background)), var(--color-background) 70%)';
    wrap.innerHTML = `
      <div class="relative flex items-center justify-center" style="width:300px;height:300px">
        ${rays()}
        <div class="streak-flame relative z-10 flex items-center justify-center">
          ${icon('local_fire_department', 'text-flame')}
        </div>
        <span data-streak class="absolute z-20 font-mono font-bold text-on-surface" style="font-size:72px;bottom:66px">0</span>
      </div>
      <div class="streak-copy flex flex-col items-center gap-1">
        <p class="text-headline-lg font-headline text-on-surface">${streak} day streak!</p>
        <p class="text-body-md text-on-surface-variant">You hit today's goal. Keep the fire going.</p>
      </div>
      <button data-continue class="streak-copy mt-2 bg-primary text-on-primary rounded-full px-10 py-3.5 text-[16px] font-headline active:scale-[0.98] transition-transform">Continue</button>`;
    document.body.appendChild(wrap);

    // Make the flame glyph large (icon() sizes via classes; force it here).
    const svg = wrap.querySelector('.streak-flame svg');
    if (svg) { svg.style.width = '132px'; svg.style.height = '132px'; }

    haptic.success();

    // Count the streak number up to land on the flame.
    const numEl = wrap.querySelector('[data-streak]');
    if (REDUCE() || streak <= 1) {
      numEl.textContent = String(streak);
    } else {
      const start = performance.now();
      const dur = 700;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / dur);
        numEl.textContent = String(Math.round(streak * (1 - (1 - t) ** 3)));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    let done = false;
    const close = () => {
      if (done) return;
      done = true;
      wrap.style.transition = 'opacity 0.25s ease';
      wrap.style.opacity = '0';
      setTimeout(() => { wrap.remove(); resolve(); }, 250);
    };
    wrap.querySelector('[data-continue]').addEventListener('click', close);
  });
}

/**
 * Called from the results screen after a session. If today has just cleared its
 * XP goal (and we haven't already celebrated today), fires the full-screen fire.
 * Retries briefly because the last answer's write may still be in flight.
 */
export async function maybeCelebrateStreak() {
  const goal = getSettings().dailyGoal;
  const todayKey = localDayKey(new Date());
  if (getStreakCelebratedDay() === todayKey) return;

  let todayXp = 0;
  let streak = 0;
  for (let i = 0; i < 3; i++) {
    invalidate('attempt-events', 'streak-state');
    try {
      const [events, state] = await Promise.all([
        fetchAttemptEvents(),
        fetchStreakState().catch(() => null),
      ]);
      todayXp = dailyXp(events).get(todayKey) ?? 0;
      streak = state?.streak ?? 0;
      if (todayXp >= goal) break;
    } catch { /* retry */ }
    if (i < 2) await new Promise((r) => setTimeout(r, 450));
  }

  if (todayXp < goal) return;
  setStreakCelebratedDay(todayKey);
  await showStreakCelebration({ streak: Math.max(1, streak) });
}
