// Full-screen friend comparison: an onboarding-style header (both faces with the
// shared streak lit between them), an XP-over-time line chart, and a you-vs-them
// stat table. Replaces the old bottom-sheet compare.
import {
  fetchFriendFreezes, fetchFriends, fetchFriendStats, fetchFriendXpSeries, fetchMutualStreaks,
  fetchMyProfile, fetchMyStats, fetchMyXpSeries, giftStreakFreeze,
} from '../api/friends.js';
import { invalidate, weekActivity } from '../api/queries.js';
import { avatarTile } from '../avatars.js';
import { haptic } from '../lib/feedback.js';
import { attachPullToRefresh } from '../lib/pullToRefresh.js';
import { confirmSheet, esc, icon, showSheet, spinner, subHeader, xpWeekChart } from '../ui.js';

// A [{ day, xp }] series → this week's Sun→Saturday shape { xps, total }, with
// future days left unplotted (null) so the line stops at today.
function toWeek(series) {
  const map = new Map((series ?? []).map((d) => [d.day, Number(d.xp) || 0]));
  const days = weekActivity(map);
  return {
    xps: days.map((d) => (d.future ? null : d.xp)),
    total: days.reduce((s, d) => s + d.xp, 0),
  };
}

export function render() {
  return `
  ${subHeader('Compare')}
  <main class="pt-page pb-page-sub px-5">
    <div data-body class="flex flex-col gap-4">
      <div class="flex justify-center py-16">${spinner()}</div>
    </div>
  </main>`;
}

export function mount(root, friendId) {
  const body = root.querySelector('[data-body]');

  async function draw() {
    try {
      const [me, myProfile, them, streaks, friends, mySeries, theirSeries, freezes] = await Promise.all([
        fetchMyStats(),
        fetchMyProfile().catch(() => ({})),
        fetchFriendStats(friendId),
        fetchMutualStreaks().catch(() => new Map()),
        fetchFriends().catch(() => ({ accepted: [] })),
        fetchMyXpSeries(7),
        fetchFriendXpSeries(friendId, 7).catch(() => []),
        fetchFriendFreezes().catch(() => new Map()),
      ]);
      const friend = (friends.accepted ?? []).find((f) => f.id === friendId) ?? {};
      const mutualState = streaks.get(friendId) ?? {};
      const meToday = me.todayXp >= me.goal;
      const mine = toWeek(mySeries);
      const theirs = toWeek(theirSeries);

      body.innerHTML = `
        ${headerCard(myProfile, friend, them, mutualState, meToday)}
        ${giftCard(them, freezes.get(friendId))}
        <div class="bg-surface rounded-3xl p-6 flex flex-col gap-3 shadow-card">
          <h3 class="text-headline-sm font-headline text-on-surface">This week</h3>
          ${xpWeekChart([
            { xps: mine.xps, color: 'primary', label: 'You', total: mine.total },
            { xps: theirs.xps, color: 'flame', label: them.name, total: theirs.total },
          ], { legend: true })}
        </div>
        ${compareCard(me, them)}`;
      wireGift(them);
    } catch (err) {
      body.innerHTML = `<p class="text-body-sm text-error text-center py-16">${esc(String(err?.message || err))}</p>`;
    }
  }

  // Wires the "Gift a streak freeze" card (only present when the friend has room).
  function wireGift(them) {
    const btn = body.querySelector('[data-gift-btn]');
    if (!btn) return;
    btn.addEventListener('click', () => {
      confirmSheet({
        title: 'Gift a streak freeze?',
        message: `${them.name} gets one streak freeze to protect a missed day. You can gift them again in two weeks.`,
        confirmLabel: 'Gift freeze',
        onConfirm: async () => {
          btn.disabled = true;
          try {
            await giftStreakFreeze(friendId);
            haptic.success();
            invalidate('friends:freezes');
            showSheet(`
              <h2 class="text-headline-sm font-headline text-on-surface mb-2">Freeze sent ❄️</h2>
              <p class="text-body-md text-on-surface-variant mb-4">${esc(them.name)} now has an extra streak freeze. Nice one.</p>
              <button data-close class="w-full py-3 rounded-full bg-primary text-on-primary text-body-sm">Done</button>`);
            await draw();
          } catch (err) {
            btn.disabled = false;
            showSheet(`
              <h2 class="text-headline-sm font-headline text-on-surface mb-2">Couldn't gift that</h2>
              <p class="text-body-md text-on-surface-variant mb-4">${esc(String(err?.message || err))}</p>
              <button data-close class="w-full py-3 rounded-full bg-primary text-on-primary text-body-sm">OK</button>`);
          }
        },
      });
    });
  }

  const detachPull = attachPullToRefresh(async () => {
    invalidate('friends');
    await draw();
  });

  draw();
  return () => detachPull();
}

// The gift card: an action when the friend holds fewer than 2 freezes, otherwise a
// muted "topped up" note so the section reads consistently either way.
function giftCard(them, theirFreezes) {
  const canGift = typeof theirFreezes === 'number' && theirFreezes < 2;
  if (canGift) {
    return `
    <button data-gift-btn class="w-full bg-surface rounded-3xl p-4 flex items-center gap-3 shadow-card active:scale-[0.99] transition-transform text-left disabled:opacity-60">
      <div class="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
        ${icon('gift', 'text-primary text-[20px]')}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-body-md text-on-surface">Gift a streak freeze</p>
        <p class="text-body-sm text-on-surface-variant">Help ${esc(them.name)} protect a missed day.</p>
      </div>
      ${icon('chevron_right', 'text-outline-variant shrink-0')}
    </button>`;
  }
  return `
  <div class="bg-surface rounded-3xl p-4 flex items-center gap-3 shadow-card">
    <div class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0">
      ${icon('ac_unit', 'text-outline text-[20px]')}
    </div>
    <p class="text-body-sm text-on-surface-variant">${esc(them.name)} is topped up on streak freezes.</p>
  </div>`;
}

// The shared fire between the two faces reflects today: cold and stroked while
// neither of you is done, flame-coloured on an amber field once one of you has
// hit today's goal, and filled solid when you both have.
function headerCard(myProfile, friend, them, mutualState, meToday) {
  const mutual = mutualState.streak ?? 0;
  const live = mutual > 0;
  const lit = (meToday ? 1 : 0) + (mutualState.friendToday ? 1 : 0);
  const copy = lit === 2
    ? `You’ve both hit today’s goal — ${mutual} day${mutual === 1 ? '' : 's'} and counting.`
    : lit === 1
      ? (meToday
        ? `You’re done for today. The fire fills when ${esc(them.name)} hits their goal too.`
        : `${esc(them.name)} is done for today — hit your goal to fill the fire.`)
      : live
        ? `You’ve both hit your goal ${mutual} day${mutual === 1 ? '' : 's'} running. Hit today’s goals to light the fire.`
        : `Both hit your daily goal on the same day to start a streak with ${esc(them.name)}.`;
  return `
  <section class="bg-surface rounded-3xl p-6 shadow-card">
    <div class="relative flex items-center justify-center gap-2">
      <div class="flex flex-col items-center gap-2 flex-1 min-w-0">
        ${avatarTile(myProfile.avatar, myProfile.display_name, { size: 64 })}
        <span class="text-body-sm text-on-surface truncate max-w-full">You</span>
      </div>
      <div class="flex flex-col items-center gap-1 shrink-0 px-2">
        <div class="w-14 h-14 rounded-full flex items-center justify-center ${lit ? 'bg-mastery/25' : 'bg-surface-container'}">
          ${icon('local_fire_department', `${lit ? 'text-flame' : 'text-outline'} text-[30px]`, lit === 2)}
        </div>
        <span class="font-mono text-[15px] leading-none ${live || lit ? 'text-flame' : 'text-on-surface-variant'}">${mutual}</span>
        <span class="text-label-sm text-on-surface-variant">day${mutual === 1 ? '' : 's'}</span>
      </div>
      <div class="flex flex-col items-center gap-2 flex-1 min-w-0">
        ${avatarTile(friend.avatar, them.name, { size: 64 })}
        <span class="text-body-sm text-on-surface truncate max-w-full">${esc(them.name)}</span>
      </div>
    </div>
    <p class="text-body-sm text-on-surface-variant text-center mt-4">${copy}</p>
  </section>`;
}

function compareCard(me, them) {
  const rows = [
    { label: 'Day streak', a: me.streak, b: them.streak },
    { label: 'Packs completed', a: me.packs, b: them.packs },
    { label: 'Words mastered', a: me.mastered, b: them.mastered },
    { label: 'Level', a: me.level, b: them.level },
    { label: 'Total XP', a: me.totalXp, b: them.totalXp },
    { label: 'Accuracy', a: Math.round(me.accuracy * 100), b: Math.round(them.accuracy * 100), suffix: '%' },
  ];
  const cell = (v, win, suffix = '') => `
    <span class="flex-1 text-center font-mono text-[20px] ${win ? 'text-primary' : 'text-on-surface-variant'}">${v}${suffix}</span>`;
  return `
  <div class="bg-surface rounded-3xl p-6 shadow-card">
    <div class="flex items-center gap-3 mb-3">
      <span class="flex-1 text-center text-label-sm uppercase text-on-surface-variant">You</span>
      <span class="w-28 shrink-0"></span>
      <span class="flex-1 text-center text-label-sm uppercase text-on-surface-variant truncate">${esc(them.name)}</span>
    </div>
    ${rows.map((r) => `
      <div class="flex items-center gap-3 py-2.5 border-b border-progress-track last:border-0">
        ${cell(r.a, r.a > r.b, r.suffix)}
        <span class="w-28 shrink-0 text-center text-body-sm text-on-surface-variant">${esc(r.label)}</span>
        ${cell(r.b, r.b > r.a, r.suffix)}
      </div>`).join('')}
  </div>`;
}
