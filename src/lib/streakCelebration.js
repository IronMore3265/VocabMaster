// Full-screen fire when a day first clears its XP goal and extends the streak —
// the Duolingo moment. All motion is CSS (see .streak-* in style.css), so the
// global prefers-reduced-motion rule flattens it. Resolves when dismissed.
import { icon } from '../ui.js';
import { haptic } from './feedback.js';
import {
  dailyXp, fetchAttemptEvents, fetchStreakState, invalidate, levelForXp, localDayKey, totalXp,
} from '../api/queries.js';
import {
  getLevelCelebrated, getSettings, getStreakCelebratedDay, setLevelCelebrated,
  setStreakCelebratedDay,
} from '../store.js';

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

/**
 * Full-screen "you levelled up" moment — the same rays-and-glyph language as the
 * streak fire, in the blue primary with the level's circle-arrow-up mark.
 */
export function showLevelCelebration({ level = 2 } = {}) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'streak-cel fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 px-8 text-center';
    wrap.style.background = 'radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--color-primary) 20%, var(--color-background)), var(--color-background) 70%)';
    wrap.innerHTML = `
      <div class="relative flex items-center justify-center" style="width:300px;height:300px">
        ${rays()}
        <div class="streak-flame relative z-10 flex items-center justify-center">
          ${icon('circle_arrow_up', 'text-primary')}
        </div>
      </div>
      <div class="streak-copy flex flex-col items-center gap-1">
        <p class="text-headline-lg font-headline text-on-surface">Level ${level}!</p>
        <p class="text-body-md text-on-surface-variant">You levelled up. Onward.</p>
      </div>
      <button data-continue class="streak-copy mt-2 bg-primary text-on-primary rounded-full px-10 py-3.5 text-[16px] font-headline active:scale-[0.98] transition-transform">Continue</button>`;
    document.body.appendChild(wrap);

    const svg = wrap.querySelector('.streak-flame svg');
    if (svg) { svg.style.width = '132px'; svg.style.height = '132px'; }

    haptic.success();

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
 * Seeds the "highest level already celebrated" baseline to the user's current
 * level on first run (or after the feature ships), so returning users don't get a
 * spurious level-up popup for a level they reached long ago. Called at boot.
 */
export async function primeLevelBaseline() {
  if (getLevelCelebrated() > 0) return;
  try {
    const level = levelForXp(totalXp(await fetchAttemptEvents())).level;
    setLevelCelebrated(Math.max(1, level));
  } catch { /* best-effort; maybeCelebrateLevelUp seeds it lazily too */ }
}

// Fires the level-up screen when lifetime XP has crossed into a higher level than
// we last celebrated. Stamps every crossing (even the silent level-1 baseline) so
// it never replays.
async function maybeCelebrateLevelUp() {
  try {
    invalidate('attempt-events');
    const level = levelForXp(totalXp(await fetchAttemptEvents())).level;
    const celebrated = getLevelCelebrated();
    if (level > celebrated) {
      setLevelCelebrated(level);
      if (level > 1) await showLevelCelebration({ level });
    }
  } catch { /* best-effort */ }
}

/**
 * Post-session celebrations, in order: the streak fire (if today just hit its
 * goal), then the level-up screen (if lifetime XP crossed a level). Called from
 * the results screen and the flashcards review-complete screen.
 */
export async function runPostSessionCelebrations() {
  await maybeCelebrateStreak();
  await maybeCelebrateLevelUp();
}
