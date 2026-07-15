import './style.css';

import { forceRender, navigate, startRouter } from './router.js';
import { getAuthState, onAuthChange, signOut } from './auth.js';
import { isOnboarded } from './store.js';
import { applyTheme } from './theme.js';
import { closeTopSheet, icon, showSheet } from './ui.js';

import * as onboarding from './screens/onboarding.js';
import * as signIn from './screens/sign-in.js';
import * as signUp from './screens/sign-up.js';
import * as library from './screens/library.js';
import * as book from './screens/book.js';
import * as pack from './screens/pack.js';
import * as flashcards from './screens/flashcards.js';
import * as matching from './screens/matching.js';
import * as fillBlank from './screens/fill-blank.js';
import * as synAnt from './screens/syn-ant.js';
import * as dictionary from './screens/dictionary.js';
import * as analytics from './screens/analytics.js';
import * as ai from './screens/ai.js';
import * as results from './screens/results.js';
import * as settings from './screens/settings.js';

const routes = [
  { pattern: /^#\/onboarding$/, screen: onboarding },
  { pattern: /^#\/sign-in$/, screen: signIn },
  { pattern: /^#\/sign-up$/, screen: signUp },
  { pattern: /^#\/library$/, screen: library },
  { pattern: /^#\/dictionary$/, screen: dictionary },
  { pattern: /^#\/analytics$/, screen: analytics },
  { pattern: /^#\/book\/(\d+)$/, screen: book },
  { pattern: /^#\/pack\/(\d+)$/, screen: pack },
  { pattern: /^#\/practice\/(\d+)\/flashcards$/, screen: flashcards },
  { pattern: /^#\/practice\/(\d+)\/matching$/, screen: matching },
  { pattern: /^#\/practice\/(\d+)\/fill-blank$/, screen: fillBlank },
  { pattern: /^#\/practice\/(\d+)\/syn-ant$/, screen: synAnt },
  { pattern: /^#\/practice\/ai$/, screen: ai },
  { pattern: /^#\/results\/(\d+)\/(\d+)$/, screen: results },
  { pattern: /^#\/settings$/, screen: settings },
];

const AUTH_ROUTES = /^#\/(sign-in|sign-up)$/;

// Decides where a hash is allowed to land given onboarding + auth state.
function gate(hash) {
  if (!isOnboarded()) return hash === '#/onboarding' ? null : '#/onboarding';
  const signedIn = !!getAuthState().session;
  if (!signedIn) return AUTH_ROUTES.test(hash) ? null : '#/sign-in';
  // Signed in: onboarding/auth screens have nowhere to go but the app.
  if (hash === '#/onboarding' || AUTH_ROUTES.test(hash)) return '#/library';
  return null;
}

// ---------- global navigation delegation ----------
document.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-nav]');
  if (!nav) return;
  const target = nav.getAttribute('data-nav');
  if (target === 'back') {
    if (history.length > 1) history.back();
    else navigate('#/library');
  } else if (target === 'menu') {
    openMenu();
  } else {
    navigate(target);
  }
});

function openMenu() {
  const item = (route, iconName, label, close = true) => `
    <button data-nav="${route}" ${close ? 'data-close' : ''} class="w-full flex items-center gap-4 px-2 py-4 border-b border-progress-track text-on-surface active:bg-surface-container-low transition-colors">
      ${icon(iconName, 'text-primary')}
      <span class="text-body-md">${label}</span>
    </button>`;
  const { el, close } = showSheet(`
    <h2 class="text-headline-sm font-headline text-on-surface mb-4">VocabMaster</h2>
    ${item('#/library', 'local_library', 'Library')}
    ${item('#/dictionary', 'dictionary', 'Dictionary')}
    ${item('#/analytics', 'monitoring', 'Analytics')}
    ${item('#/settings', 'settings', 'Settings')}
    <button data-signout class="w-full flex items-center gap-4 px-2 py-4 text-on-surface-variant active:bg-surface-container-low transition-colors">
      ${icon('logout', 'text-on-surface-variant')}
      <span class="text-body-md">Sign out</span>
    </button>
  `);
  el.querySelector('[data-signout]').addEventListener('click', () => { close(); signOut(); });
}

// ---------- Android hardware back button ----------
import('@capacitor/app')
  .then(({ App }) => {
    App.addListener('backButton', ({ canGoBack }) => {
      if (closeTopSheet()) return;
      const hash = location.hash || '#/library';
      if (hash === '#/library' || hash === '#/onboarding' || hash === '#/sign-in') App.exitApp();
      else if (canGoBack) history.back();
      else navigate('#/library');
    });
  })
  .catch(() => { /* not on native — fine */ });

// ---------- boot ----------
applyTheme();

let started = false;
function boot() {
  if (started) return;
  started = true;
  document.getElementById('app').innerHTML = '';
  startRouter({ routes, gate });
}

// Splash until the persisted session is restored.
document.getElementById('app').innerHTML = `
  <div class="min-h-dvh flex flex-col items-center justify-center gap-4 bg-background">
    <div class="w-[72px] h-[72px] rounded-3xl bg-primary-fixed flex items-center justify-center">
      ${icon('menu_book', 'text-primary text-[36px]')}
    </div>
    <span class="text-headline-sm font-headline text-on-surface">VocabMaster</span>
  </div>`;

onAuthChange(() => {
  if (!started) boot();
  else forceRender();
});

// If auth already resolved synchronously (rare) or after a tick, ensure boot.
if (!getAuthState().initializing) boot();
