import {
  computeLongestStreak, computeStreak, dailyActivity, dailyXp, fetchAttemptEvents,
  fetchExerciseAccuracy, fetchPackProgress, fetchStreakState, fetchWeakWords, levelForXp,
  localDayKey, qualifyingDays, totalXp,
} from '../api/queries.js';
import { packsCompleted } from '../api/friends.js';
import { getSettings } from '../store.js';
import { EXERCISE_LABELS } from '../lib/models.js';
import {
  appHeader, bindCountUps, bottomNav, emptyState, esc, icon, progressBar, progressRing, spinner,
  statTile,
} from '../ui.js';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// A compact 7-day XP bar chart with the daily goal drawn across it.
function weeklyChart(byDay, goal) {
  const days = dailyActivity(byDay, 7);
  const weekTotal = days.reduce((s, d) => s + d.xp, 0);
  // Scale to whichever is bigger so the goal line always sits on the chart.
  const max = Math.max(goal, 1, ...days.map((d) => d.xp));
  const goalPct = Math.min(100, Math.round((goal / max) * 100));
  const bars = days.map((d, i) => {
    const pct = d.xp ? Math.max(8, Math.round((d.xp / max) * 100)) : 0;
    const today = d.key === localDayKey(new Date());
    const met = d.xp >= goal;
    return `
    <div class="flex-1 flex flex-col items-center gap-2">
      <div class="w-full flex items-end justify-center" style="height:96px">
        <div class="grow-y w-full max-w-[24px] rounded-t-md ${met ? 'bg-flame' : d.xp ? 'bg-primary-fixed-dim' : 'bg-progress-track'}"
          style="height:${d.xp ? pct : 6}%;animation-delay:${0.05 + i * 0.05}s"></div>
      </div>
      <span class="text-label-sm ${today ? 'text-primary font-semibold' : 'text-on-surface-variant'}">${DOW[d.date.getDay()]}</span>
    </div>`;
  }).join('');
  return `
  <div class="bg-surface rounded-3xl p-6 flex flex-col gap-4 shadow-card">
    <div class="flex items-center justify-between">
      <h3 class="text-headline-sm font-headline text-on-surface">This week</h3>
      <span class="font-mono text-label-md text-on-surface-variant">${weekTotal} XP</span>
    </div>
    <div class="relative flex items-end gap-1.5" style="height:96px">
      <div class="absolute left-0 right-0 border-t border-dashed border-flame/60 flex justify-end" style="bottom:${goalPct}%">
        <span class="text-[10px] font-mono text-flame -mt-3.5 bg-surface px-1">goal ${goal}</span>
      </div>
      ${bars}
    </div>
  </div>`;
}

export function render() {
  return `
  ${appHeader('Analytics')}
  <main class="pt-page pb-page px-5">
    <div class="flex flex-col gap-1 mt-1 mb-4">
      <h2 class="text-headline-lg font-headline text-on-surface">Progress</h2>
      <p class="text-body-md text-on-surface-variant">Your learning at a glance.</p>
    </div>
    <div data-body class="flex flex-col gap-4 stagger">
      <div class="flex justify-center py-10">${spinner()}</div>
    </div>
  </main>
  ${bottomNav('#/analytics')}`;
}

export function mount(root) {
  const body = root.querySelector('[data-body]');
  const goal = getSettings().dailyGoal;

  Promise.all([
    fetchExerciseAccuracy().catch(() => []),
    fetchWeakWords(10).catch(() => []),
    fetchAttemptEvents().catch(() => []),
    fetchPackProgress().catch(() => []),
    fetchStreakState().catch(() => null),
  ]).then(([accuracy, weak, events, progress, streakState]) => {
    const byDay = dailyXp(events);
    const qual = qualifyingDays(byDay, goal, streakState?.freezeDays);
    const streak = streakState?.streak ?? computeStreak(qual);
    const longest = computeLongestStreak(qual);
    const freezes = streakState?.freezes ?? 0;
    const totalAttempts = accuracy.reduce((s, r) => s + (r.attempts ?? 0), 0);
    const overall = totalAttempts > 0
      ? accuracy.reduce((s, r) => s + (r.accuracy ?? 0) * (r.attempts ?? 0), 0) / totalAttempts
      : 0;
    const mastered = progress.reduce((s, r) => s + (r.mastered ?? 0), 0);
    const totalWords = progress.reduce((s, r) => s + (r.word_count ?? 0), 0);
    const masteryRatio = totalWords > 0 ? mastered / totalWords : 0;
    const packs = packsCompleted(progress);
    const xp = totalXp(events);
    const lvl = levelForXp(xp);
    const todayXp = byDay.get(localDayKey(new Date())) ?? 0;
    const todayRatio = Math.min(1, todayXp / goal);

    body.innerHTML = `
    <div class="bg-surface rounded-3xl p-6 flex items-center gap-5 shadow-card">
      ${progressRing({ progress: todayRatio, size: 96, stroke: 11, label: `${todayXp}` })}
      <div class="flex-1 min-w-0">
        <p class="text-label-sm uppercase text-on-surface-variant">Today's goal</p>
        <p class="text-headline-sm font-headline text-on-surface">${todayXp} / ${goal} XP</p>
        <p class="text-body-sm text-on-surface-variant mt-0.5">
          ${todayXp >= goal ? 'Goal reached — streak secured!' : `${goal - todayXp} XP to keep your streak`}
        </p>
      </div>
    </div>

    <div class="flex gap-3">
      ${statTile({ iconName: 'local_fire_department', countTo: streak, label: 'DAY STREAK' })}
      ${statTile({ iconName: 'bolt', countTo: longest, label: 'BEST STREAK' })}
    </div>
    <div class="flex items-center justify-center gap-1.5 text-label-sm text-on-surface-variant -mt-1">
      ${icon('ac_unit', 'text-primary text-[15px]')}
      <span class="font-mono">${freezes}</span> streak freeze${freezes === 1 ? '' : 's'} · covers a missed day
    </div>

    <div class="flex gap-3">
      ${statTile({ iconName: 'task_alt', countTo: packs, label: 'PACKS DONE' })}
      ${statTile({ iconName: 'target', countTo: Math.round(overall * 100), suffix: '%', label: 'ACCURACY' })}
    </div>

    <div class="bg-surface rounded-3xl p-6 flex items-center gap-4 shadow-card">
      <div class="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center shrink-0">
        ${icon('bolt', 'text-primary text-[24px]')}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline justify-between">
          <p class="text-headline-sm font-headline text-on-surface">Level ${lvl.level}</p>
          <span class="font-mono text-label-sm text-on-surface-variant">${xp} XP</span>
        </div>
        ${progressBar(lvl.span > 0 ? lvl.into / lvl.span : 0, { height: 8, className: 'mt-2' })}
        <p class="text-body-sm text-on-surface-variant mt-1.5">${lvl.ceil - xp} XP to level ${lvl.level + 1}</p>
      </div>
    </div>

    ${weeklyChart(byDay, goal)}

    <div class="bg-surface rounded-3xl p-6 flex flex-col gap-3 shadow-card">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          ${icon('workspace_premium', 'text-primary text-[22px]')}
          <h3 class="text-headline-sm font-headline text-on-surface">Library mastery</h3>
        </div>
        <span class="font-mono text-headline-sm text-primary">${Math.round(masteryRatio * 100)}%</span>
      </div>
      ${progressBar(masteryRatio, { height: 10 })}
      <span class="text-body-sm text-on-surface-variant">${mastered} of ${totalWords} words mastered</span>
    </div>

    ${accuracy.length > 0 ? `
      <div class="bg-surface rounded-3xl p-6 flex flex-col gap-3.5 shadow-card">
        <h3 class="text-headline-sm font-headline text-on-surface">Accuracy by exercise</h3>
        ${accuracy.map((r) => `
          <div class="flex flex-col gap-1.5">
            <div class="flex justify-between">
              <span class="text-body-sm text-on-surface-variant">${esc(r.exercise_type ? EXERCISE_LABELS[r.exercise_type] : '—')}</span>
              <span class="font-mono text-label-sm text-on-surface-variant">${Math.round((r.accuracy ?? 0) * 100)}%</span>
            </div>
            ${progressBar(r.accuracy ?? 0, { height: 6 })}
          </div>`).join('')}
      </div>` : ''}

    ${weak.length > 0 ? `
      <div class="bg-surface rounded-3xl p-6 shadow-card">
        <h3 class="text-headline-sm font-headline text-on-surface mb-2">Words to review</h3>
        ${weak.map((w) => `
          <button ${w.pack_id ? `data-nav="#/pack/${w.pack_id}"` : ''} class="w-full text-left flex items-center gap-3 py-2.5 border-b border-progress-track last:border-0">
            <div class="flex-1 min-w-0">
              <p class="text-body-md text-on-surface">${esc(w.word)}</p>
              <p class="text-body-sm text-on-surface-variant truncate">${esc(w.definition ?? '')}</p>
            </div>
            <span class="bg-error-container text-on-error-container rounded-full px-2.5 py-0.5 text-label-sm">×${w.wrong_count}</span>
          </button>`).join('')}
      </div>`
      : emptyState('sentiment_satisfied', 'No weak words yet', 'Miss a word twice and it shows up here.')}`;

    bindCountUps(body);
  }).catch(() => {
    body.innerHTML = `<p class="text-body-sm text-error text-center py-10">Couldn't load your progress.</p>`;
  });
}
