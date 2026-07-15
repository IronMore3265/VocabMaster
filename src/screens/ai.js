import { completeSuggestion, mcqItems, suggestExercise } from '../api/ai.js';
import { hasSeenAiIntro, setAiIntroSeen } from '../store.js';
import { appHeader, bottomNav, icon, primaryBtn, spinner } from '../ui.js';
import { mountMcqSession } from './_mcq.js';

export function render() {
  return `
  ${appHeader('AI Coach')}
  <main class="pt-page pb-page flex flex-col" style="min-height:100dvh">
    <div data-body class="flex-1 flex flex-col px-5"></div>
  </main>
  ${bottomNav('#/practice/ai')}`;
}

export function mount(root) {
  const body = root.querySelector('[data-body]');
  const nav = root.querySelector('nav');
  let response = null;
  let loading = true;
  let errored = false;

  // First visit: explain what the coach does before spending a request on it.
  function drawIntro() {
    const feature = (ic, text) => `
      <div class="flex items-start gap-3">
        ${icon(ic, 'text-primary text-[22px] shrink-0 mt-0.5')}
        <p class="text-body-md text-on-surface">${text}</p>
      </div>`;
    body.innerHTML = `
    <div class="flex flex-col gap-4 pt-4">
      <div class="bg-surface rounded-3xl p-6 flex flex-col gap-4 shadow-card">
        <div class="w-16 h-16 rounded-2xl bg-primary-fixed flex items-center justify-center">
          ${icon('auto_awesome', 'text-primary text-[32px]')}
        </div>
        <div class="flex flex-col gap-1.5">
          <h2 class="text-headline-md font-headline text-on-surface">Meet your AI Coach</h2>
          <p class="text-body-md text-on-surface-variant">Here's what it does for you:</p>
        </div>
        <div class="flex flex-col gap-3">
          ${feature('target', 'Finds the words you keep getting wrong across every exercise.')}
          ${feature('school', 'Builds a short, personalized quiz focused on exactly those weak spots.')}
          ${feature('trending_up', 'Adapts each day as your accuracy and streak change.')}
        </div>
      </div>
      ${primaryBtn('Build my first session', 'data-go')}
    </div>`;
    body.querySelector('[data-go]').addEventListener('click', () => {
      setAiIntroSeen();
      request(false);
    });
  }

  const request = async (force = false) => {
    loading = true; errored = false; response = null; draw();
    try {
      response = await suggestExercise({ force });
    } catch {
      errored = true;
    }
    loading = false; draw();
  };

  const centered = (inner) =>
    `<div class="flex-1 flex flex-col items-center justify-center text-center gap-3.5 px-4">${inner}</div>`;

  function draw() {
    const payload = response?.payload;
    const items = payload ? mcqItems(payload) : [];

    if (loading) {
      body.innerHTML = centered(`
        ${icon('auto_awesome', 'text-primary text-[44px]')}
        ${spinner()}
        <p class="text-body-md text-on-surface-variant">Analyzing your mistakes and building<br>a personalized session…</p>`);
      return;
    }

    if (errored) {
      body.innerHTML = centered(`
        ${icon('error', 'text-error text-[40px]')}
        <p class="text-body-md text-on-surface-variant">Could not reach the AI coach. Try again in a moment.</p>
        <div class="w-40">${primaryBtn('Retry', 'data-retry')}</div>`);
      body.querySelector('[data-retry]').addEventListener('click', () => request(false));
      return;
    }

    if (response?.error === 'not_enough_data') {
      body.innerHTML = centered(`
        ${icon('school', 'text-outline-variant text-[44px]')}
        <p class="text-body-md text-on-surface-variant">${escapeText(response.message) || 'Practice more first so the AI can find your weak spots.'}</p>`);
      return;
    }

    if (response?.error) {
      body.innerHTML = centered(`
        ${icon('error', 'text-error text-[40px]')}
        <p class="text-body-sm text-on-surface-variant">The AI coach hit a snag: ${escapeText(response.error)}</p>
        <div class="w-40">${primaryBtn('Try again', 'data-force')}</div>`);
      body.querySelector('[data-force]').addEventListener('click', () => request(true));
      return;
    }

    if (payload) {
      body.innerHTML = `
      <div class="flex flex-col gap-4 pt-4">
        <div class="bg-surface rounded-3xl p-6 flex flex-col gap-3 shadow-card">
          <div class="flex items-center gap-2.5">
            ${icon('auto_awesome', 'text-primary text-[24px]')}
            <h3 class="text-headline-sm font-headline text-on-surface">Your focus today</h3>
          </div>
          <p class="text-body-md text-on-surface-variant">${escapeText(payload.focusSummary)}</p>
          <span class="text-label-sm uppercase text-outline">${items.length} questions · mixed${response?.cached ? ' · from today’s plan' : ''}</span>
        </div>
        ${primaryBtn(`${icon('play_arrow', 'text-[22px]')}<span>Start Session</span>`, 'data-start')}
        <button data-fresh class="self-center py-2 text-body-sm text-primary">Generate a fresh session instead</button>
      </div>`;
      body.querySelector('[data-start]').addEventListener('click', () => startSession(items));
      body.querySelector('[data-fresh]').addEventListener('click', () => request(true));
    }
  }

  function startSession(items) {
    const suggestionId = response?.suggestionId;
    // Give the quiz the full screen — the tab bar would cover the Finish button.
    nav?.style.setProperty('display', 'none');
    mountMcqSession(body, {
      items,
      packId: items[0]?.packId ?? 0,
      exerciseType: 'ai_mixed',
      headerLabel: 'AI Session',
      onFinished: (correct, total) => {
        if (suggestionId) completeSuggestion({ suggestionId, score: correct / total }).catch(() => {});
      },
    });
  }

  if (hasSeenAiIntro()) request(false);
  else { loading = false; drawIntro(); }
}

function escapeText(s) {
  return String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}
