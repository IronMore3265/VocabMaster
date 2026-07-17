// Full-screen friend comparison: an onboarding-style header (both faces with the
// shared streak lit between them), an XP-over-time line chart, and a you-vs-them
// stat table. Replaces the old bottom-sheet compare.
import {
  fetchFriends, fetchFriendStats, fetchFriendXpSeries, fetchMutualStreaks, fetchMyProfile,
  fetchMyStats, fetchMyXpSeries,
} from '../api/friends.js';
import { invalidate } from '../api/queries.js';
import { avatarTile } from '../avatars.js';
import { attachPullToRefresh } from '../lib/pullToRefresh.js';
import { esc, icon, spinner, subHeader, xpLineChart } from '../ui.js';

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
      const [me, myProfile, them, streaks, friends, mySeries, theirSeries] = await Promise.all([
        fetchMyStats(),
        fetchMyProfile().catch(() => ({})),
        fetchFriendStats(friendId),
        fetchMutualStreaks().catch(() => new Map()),
        fetchFriends().catch(() => ({ accepted: [] })),
        fetchMyXpSeries(30),
        fetchFriendXpSeries(friendId, 30).catch(() => []),
      ]);
      const friend = (friends.accepted ?? []).find((f) => f.id === friendId) ?? {};
      const mutual = streaks.get(friendId)?.streak ?? 0;

      body.innerHTML = `
        ${headerCard(myProfile, friend, them, mutual)}
        <div class="bg-surface rounded-3xl p-6 flex flex-col gap-3 shadow-card">
          <h3 class="text-headline-sm font-headline text-on-surface">XP over the last 30 days</h3>
          ${xpLineChart(mySeries, padSeries(theirSeries, mySeries.length), { myLabel: 'You', theirLabel: them.name })}
        </div>
        ${compareCard(me, them)}`;
    } catch (err) {
      body.innerHTML = `<p class="text-body-sm text-error text-center py-16">${esc(String(err?.message || err))}</p>`;
    }
  }

  const detachPull = attachPullToRefresh(async () => {
    invalidate('friends');
    await draw();
  });

  draw();
  return () => detachPull();
}

// Right-pad/truncate a friend series to match the self series length (defensive:
// both come from a 30-day window, but a tz edge could differ by one).
function padSeries(series, len) {
  if (series.length === len) return series;
  if (series.length > len) return series.slice(series.length - len);
  const pad = Array.from({ length: len - series.length }, () => ({ day: '', xp: 0 }));
  return [...pad, ...series];
}

function headerCard(myProfile, friend, them, mutual) {
  const live = mutual > 0;
  return `
  <section class="bg-surface rounded-3xl p-6 shadow-card">
    <div class="relative flex items-center justify-center gap-2">
      <div class="flex flex-col items-center gap-2 flex-1 min-w-0">
        ${avatarTile(myProfile.avatar, myProfile.display_name, { size: 64 })}
        <span class="text-body-sm text-on-surface truncate max-w-full">You</span>
      </div>
      <div class="flex flex-col items-center gap-1 shrink-0 px-2">
        <div class="w-14 h-14 rounded-full flex items-center justify-center ${live ? 'bg-flame/15' : 'bg-surface-container'}">
          ${icon('local_fire_department', live ? 'text-flame text-[30px]' : 'text-outline text-[30px]')}
        </div>
        <span class="font-mono text-[15px] leading-none ${live ? 'text-flame' : 'text-on-surface-variant'}">${mutual}</span>
        <span class="text-label-sm text-on-surface-variant">day${mutual === 1 ? '' : 's'}</span>
      </div>
      <div class="flex flex-col items-center gap-2 flex-1 min-w-0">
        ${avatarTile(friend.avatar, them.name, { size: 64 })}
        <span class="text-body-sm text-on-surface truncate max-w-full">${esc(them.name)}</span>
      </div>
    </div>
    <p class="text-body-sm text-on-surface-variant text-center mt-4">
      ${live
        ? `You’ve both hit your goal ${mutual} day${mutual === 1 ? '' : 's'} running.`
        : `Both hit your daily goal on the same day to start a streak with ${esc(them.name)}.`}
    </p>
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
