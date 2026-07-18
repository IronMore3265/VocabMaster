// Full-screen fire when a day first clears its XP goal and extends the streak —
// the Duolingo moment. All motion is CSS (see .streak-* in style.css), so the
// global prefers-reduced-motion rule flattens it. Resolves when dismissed.
import { esc, icon } from '../ui.js';
import { haptic } from './feedback.js';
import { supabase } from '../supabase.js';
import {
  dailyXp, fetchAttemptEvents, fetchStreakState, invalidate, levelForXp, localDayKey, totalXp,
} from '../api/queries.js';
import { fetchFreezeGiftsSince } from '../api/friends.js';
import {
  getFreezeGiftsSeenAt, getLevelCelebrated, getSettings, getStreakCelebratedDay,
  setFreezeGiftsSeenAt, setLevelCelebrated, setStreakCelebratedDay,
} from '../store.js';

// A ring of rays behind the glyph. Each line runs inner→outer with pathLength=1,
// so the rayDraw dash animation grows it from zero to full length, outward.
// `inner` is the start radius: the flame's body hides the default 46; the hollow
// circle-arrow ring needs the rays to start outside it or stubs show through.
function rays(stroke = 'var(--color-flame-dim)', inner = 46) {
  const spokes = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    const x1 = 150 + Math.cos(a) * inner;
    const y1 = 150 + Math.sin(a) * inner;
    const x2 = 150 + Math.cos(a) * 130;
    const y2 = 150 + Math.sin(a) * 130;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
      pathLength="1" stroke="${stroke}" stroke-width="8" stroke-linecap="round" opacity="0.55"/>`;
  }).join('');
  return `<svg class="streak-rays absolute" width="300" height="300" viewBox="0 0 300 300" aria-hidden="true">${spokes}</svg>`;
}

/**
 * Shared full-screen celebration shell: radial tint, the rays-and-glyph stage,
 * copy, and a Continue button. Resolves when dismissed. `extra` renders behind
 * the stage (the freeze gift rain); `decorate` runs against the mounted wrap
 * for per-variant DOM tweaks.
 */
function celebrate({ cls = '', tint, spokes, glyph, title, copy, extra = '', decorate }) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = `streak-cel ${cls} fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 px-8 text-center overflow-hidden`;
    wrap.style.background = `radial-gradient(circle at 50% 38%, color-mix(in srgb, ${tint} 20%, var(--color-background)), var(--color-background) 70%)`;
    wrap.innerHTML = `
      ${extra}
      <div class="relative z-10 flex items-center justify-center" style="width:300px;height:300px">
        ${spokes}
        <div class="streak-flame relative z-10 flex items-center justify-center">${glyph}</div>
      </div>
      <div class="streak-copy relative z-10 flex flex-col items-center gap-1">
        <p class="text-headline-lg font-headline text-on-surface">${title}</p>
        <p class="text-body-md text-on-surface-variant">${copy}</p>
      </div>
      <button data-continue class="streak-copy relative z-10 mt-2 bg-primary text-on-primary rounded-full px-10 py-3.5 text-[16px] font-headline active:scale-[0.98] transition-transform">Continue</button>`;
    document.body.appendChild(wrap);

    // Make the glyph large (icon() sizes via classes; force it here).
    const svg = wrap.querySelector('.streak-flame svg');
    if (svg) { svg.style.width = '132px'; svg.style.height = '132px'; }
    decorate?.(wrap);

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

export function showStreakCelebration({ streak = 1 } = {}) {
  return celebrate({
    tint: 'var(--color-flame)',
    spokes: rays(),
    glyph: icon('local_fire_department', 'text-flame'),
    title: `${streak} day streak!`,
    copy: "You hit today's goal. Keep the fire going.",
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
  return celebrate({
    cls: 'level-cel',
    tint: 'var(--color-primary)',
    spokes: rays('var(--color-primary)', 66),
    glyph: icon('circle_arrow_up', 'text-primary'),
    title: `Level ${level}!`,
    copy: 'You levelled up. Onward.',
    // The glyph is a <circle> ring plus the arrow's two <path>s; tagging the
    // paths lets levelArrowUp raise the arrow into the ring after it lands.
    decorate: (wrap) => wrap.querySelectorAll('.streak-flame svg path')
      .forEach((p) => p.classList.add('level-arrow')),
  });
}

// A falling curtain of gift glyphs behind the freeze stage. Deterministic
// pseudo-random spread; the negative delays start each drop mid-fall so the
// rain is already going when the screen opens.
function giftRain(count = 10) {
  const drops = Array.from({ length: count }, (_, i) => {
    const left = (i * 97 + 13) % 100;
    const size = 18 + ((i * 53) % 18);
    const dur = 5 + ((i * 31) % 40) / 10;
    const delay = -(((i * 71) % 55) / 10);
    return `<span style="left:${left}%;font-size:${size}px;animation-duration:${dur}s;animation-delay:${delay}s">${icon('gift', 'text-primary')}</span>`;
  }).join('');
  return `<div class="freeze-gifts absolute inset-0 z-0" aria-hidden="true">${drops}</div>`;
}

/**
 * Full-screen "a friend sent you a streak freeze" moment — gifts rain down
 * behind a slowly turning snowflake. Fired from the realtime freeze_gifts
 * listener (see main.js's vm:freeze-received handler).
 */
export function showFreezeGiftCelebration({ from = 'A friend' } = {}) {
  return celebrate({
    cls: 'freeze-cel',
    tint: 'var(--color-primary)',
    spokes: rays('var(--color-primary)', 66),
    glyph: icon('ac_unit', 'text-primary'),
    title: `${esc(from)} sent a gift!`,
    copy: 'A streak freeze — it covers a missed day so your streak survives.',
    extra: giftRain(),
  });
}

/**
 * Advances the celebrated-gift watermark. Called for gifts the realtime
 * listener already showed live, with the row's server timestamp, so the
 * boot/resume check below never replays them (device clocks can lag the
 * server, which is why "now" alone isn't enough).
 */
export function markFreezeGiftSeen(createdAt) {
  const prev = getFreezeGiftsSeenAt();
  const next = createdAt || new Date().toISOString();
  if (!prev || new Date(next) > new Date(prev)) setFreezeGiftsSeenAt(next);
}

/**
 * Boot/resume check for freeze gifts that arrived while the app was closed —
 * the realtime socket only covers the foreground. Shows one celebration for
 * whatever is new past the watermark; the first run just seeds it so old
 * gifts stay quiet.
 */
export async function checkMissedFreezeGifts() {
  try {
    const seen = getFreezeGiftsSeenAt();
    if (!seen) { setFreezeGiftsSeenAt(new Date().toISOString()); return; }
    const gifts = await fetchFreezeGiftsSince(seen);
    if (gifts.length === 0) return;
    setFreezeGiftsSeenAt(gifts[gifts.length - 1].created_at);
    invalidate('streak-state', 'friends:freezes');

    const senders = [...new Set(gifts.map((g) => g.sender_id))];
    let from = 'A friend';
    try {
      const { data } = await supabase
        .from('profiles').select('display_name').eq('id', senders[senders.length - 1]).single();
      if (data?.display_name) from = data.display_name;
    } catch { /* name is a nicety */ }
    if (senders.length > 1) from = `${from} and ${senders.length - 1} other${senders.length > 2 ? 's' : ''}`;
    await showFreezeGiftCelebration({ from });
  } catch { /* offline or signed out — the next resume retries */ }
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
