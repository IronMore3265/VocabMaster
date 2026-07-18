import {
  computeLongestStreak, computeStreak, coverageRatio, dailyXp, fetchAttemptEvents,
  fetchExerciseAccuracy, fetchPackCoverage, fetchPackProgress, fetchStreakState, fetchWeakWords,
  levelForXp, localDayKey, qualifyingDays, totalXp, weekActivity,
} from '../api/queries.js';
import { packsCompleted } from '../api/friends.js';
import { getSettings } from '../store.js';
import { EXERCISE_LABELS } from '../lib/models.js';
import {
  appHeader, bindCountUps, bottomNav, emptyState, esc, icon, progressBar, progressRing, spinner,
  statTile, xpWeekChart,
} from '../ui.js';

// The streak-freeze box: a labelled card with the two freeze pips on the right
// (blue = ready, muted = spent). Max hold is 2, hence exactly two pips.
function freezeBox(freezes) {
  const pip = (available) => `
    <div class="w-8 h-8 rounded-full flex items-center justify-center ${available ? 'bg-primary/15' : 'bg-surface-container'}"
      title="${available ? 'Streak freeze ready — covers a missed day' : 'Streak freeze spent'}">
      ${icon('ac_unit', available ? 'text-primary text-[16px]' : 'text-outline text-[16px]')}
    </div>`;
  return `
  <div class="bg-surface rounded-3xl p-5 flex items-center justify-between gap-3 shadow-card">
    <div class="flex items-center gap-3 min-w-0">
      ${icon('ac_unit', 'text-primary text-[20px] shrink-0')}
      <span class="text-body-md text-on-surface">Streak freezes available</span>
    </div>
    <div class="flex items-center gap-2 shrink-0">${pip(0 < freezes)}${pip(1 < freezes)}</div>
  </div>`;
}

// A labelled progress/mastery bar for the Library card.
function libBar(label, ratio, fillClass, pctClass) {
  return `
  <div class="flex flex-col gap-2">
    <div class="flex justify-between text-body-sm">
      <span class="text-on-surface-variant">${label}</span>
      <span class="font-mono ${pctClass}">${Math.round(ratio * 100)}%</span>
    </div>
    ${progressBar(ratio, { height: 10, fillClass })}
  </div>`;
}

// The weekly XP line chart, Sunday→Saturday. Future days this week are left
// unplotted; the goal line is gone in favour of a numeric y-axis.
function weeklyChart(byDay) {
  const days = weekActivity(byDay);
  const weekTotal = days.reduce((s, d) => s + d.xp, 0);
  const xps = days.map((d) => (d.future ? null : d.xp));
  return `
  <div class="bg-surface rounded-3xl p-6 flex flex-col gap-4 shadow-card">
    <div class="flex items-center justify-between">
      <h3 class="text-headline-sm font-headline text-on-surface">This week</h3>
      <span class="font-mono text-label-md text-on-surface-variant">${weekTotal} XP</span>
    </div>
    ${xpWeekChart([{ xps, color: 'primary' }])}
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
    fetchPackCoverage().catch(() => []),
    fetchStreakState().catch(() => null),
  ]).then(([accuracy, weak, events, progress, coverage, streakState]) => {
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
    // Overall Progress = the 25/75 coverage formula over library-wide sums.
    const overallProgress = coverageRatio({
      word_count: coverage.reduce((s, r) => s + (r.word_count ?? 0), 0),
      reviewed: coverage.reduce((s, r) => s + Number(r.reviewed ?? 0), 0),
      practiced: coverage.reduce((s, r) => s + Number(r.practiced ?? 0), 0),
    });
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

    ${freezeBox(freezes)}
    <div class="bg-surface rounded-3xl p-6 flex items-center justify-between gap-4 shadow-card">
      <div class="flex items-center gap-4 min-w-0">
        ${icon('local_fire_department', 'text-flame text-[34px] shrink-0', todayXp >= goal)}
        <div class="min-w-0">
          <span data-count-to="${streak}" class="block font-mono text-[32px] leading-9 text-on-surface">0</span>
          <span class="text-label-sm uppercase text-on-surface-variant">Day streak</span>
        </div>
      </div>
      <span class="inline-flex items-center gap-1.5 rounded-full bg-flame/15 px-3 py-1.5 text-label-md text-flame shrink-0">
        ${icon('flame_kindling', 'text-[16px]')} Best ${longest}
      </span>
    </div>

    <div class="flex gap-3">
      ${statTile({ iconName: 'task_alt', countTo: packs, label: 'PACKS DONE' })}
      ${statTile({ iconName: 'target', countTo: Math.round(overall * 100), suffix: '%', label: 'ACCURACY' })}
    </div>

    <div class="bg-surface rounded-3xl p-6 flex items-center gap-4 shadow-card">
      <div class="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center shrink-0">
        ${icon('circle_arrow_up', 'text-primary text-[24px]')}
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

    ${weeklyChart(byDay)}

    <div class="bg-surface rounded-3xl p-6 flex flex-col gap-4 shadow-card">
      <div class="flex items-center gap-2.5">
        ${icon('workspace_premium', 'text-primary text-[22px]')}
        <h3 class="text-headline-sm font-headline text-on-surface">Library</h3>
      </div>
      ${libBar('Progress', overallProgress, 'bg-primary-fixed-dim', 'text-on-surface')}
      ${libBar('Mastery', masteryRatio, 'bg-mastery', 'text-mastery')}
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
