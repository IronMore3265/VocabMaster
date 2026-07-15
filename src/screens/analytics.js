import {
  computeStreak, fetchAttemptDates, fetchExerciseAccuracy, fetchPackProgress, fetchWeakWords,
} from '../api/queries.js';
import { EXERCISE_LABELS } from '../lib/models.js';
import { appHeader, bottomNav, emptyState, esc, icon, progressBar, spinner, statTile } from '../ui.js';

export function render() {
  return `
  ${appHeader('Analytics')}
  <main class="pt-page pb-page px-5">
    <div class="flex flex-col gap-1 mt-1 mb-4">
      <h2 class="text-headline-lg font-headline text-on-surface">Progress</h2>
      <p class="text-body-md text-on-surface-variant">Your learning at a glance.</p>
    </div>
    <div data-body class="flex flex-col gap-4">
      <div class="flex justify-center py-10">${spinner()}</div>
    </div>
  </main>
  ${bottomNav('#/analytics')}`;
}

export function mount(root) {
  const body = root.querySelector('[data-body]');

  Promise.all([
    fetchExerciseAccuracy().catch(() => []),
    fetchWeakWords(10).catch(() => []),
    fetchAttemptDates().catch(() => []),
    fetchPackProgress().catch(() => []),
  ]).then(([accuracy, weak, dates, progress]) => {
    const streak = computeStreak(dates);
    const totalAttempts = accuracy.reduce((s, r) => s + (r.attempts ?? 0), 0);
    const overall = totalAttempts > 0
      ? accuracy.reduce((s, r) => s + (r.accuracy ?? 0) * (r.attempts ?? 0), 0) / totalAttempts
      : 0;
    const mastered = progress.reduce((s, r) => s + (r.mastered ?? 0), 0);

    body.innerHTML = `
    <div class="flex gap-3">
      ${statTile({ iconName: 'local_fire_department', value: String(streak), label: 'DAY STREAK' })}
      ${statTile({ iconName: 'workspace_premium', value: String(mastered), label: 'MASTERED' })}
    </div>
    <div class="flex gap-3">
      ${statTile({ iconName: 'history', value: String(totalAttempts), label: 'ATTEMPTS' })}
      ${statTile({ iconName: 'target', value: `${Math.round(overall * 100)}%`, label: 'ACCURACY' })}
    </div>

    <button data-nav="#/practice/ai" class="text-left bg-primary rounded-3xl p-6 flex flex-col gap-2 active:scale-[0.98] transition-transform">
      <div class="flex items-center gap-2.5">
        ${icon('auto_awesome', 'text-on-primary text-[26px]')}
        <span class="text-headline-sm font-headline text-on-primary">AI Coach</span>
      </div>
      <p class="text-body-sm text-on-primary/85">Generate a personalized session from the words you keep missing.</p>
    </button>

    ${accuracy.length > 0 ? `
      <div class="bg-surface rounded-3xl p-6 flex flex-col gap-3.5 shadow-card">
        <h3 class="text-headline-sm font-headline text-on-surface">Accuracy by exercise</h3>
        ${accuracy.map((r) => `
          <div class="flex flex-col gap-1.5">
            <div class="flex justify-between">
              <span class="text-body-sm text-on-surface-variant">${esc(r.exercise_type ? EXERCISE_LABELS[r.exercise_type] : '—')}</span>
              <span class="font-mono text-label-sm text-on-surface-variant">${Math.round((r.accuracy ?? 0) * 100)}% · ${r.attempts}</span>
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
  }).catch(() => {
    body.innerHTML = `<p class="text-body-sm text-error text-center py-10">Couldn't load your progress.</p>`;
  });
}
