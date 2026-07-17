import './style.css';

import { forceRender, navigate, startRouter } from './router.js';
import { getAuthState, onAuthChange, signOut } from './auth.js';
import { isOnboarded } from './store.js';
import { applyTheme } from './theme.js';
import { logoTile } from './brand.js';
import { closeTopSheet, icon, refreshProfileAvatar, showChangelogSheet, showSheet } from './ui.js';
import { haptic } from './lib/feedback.js';

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
import * as friends from './screens/friends.js';
import * as profile from './screens/profile.js';
import * as revise from './screens/revise.js';

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
  { pattern: /^#\/friends$/, screen: friends },
  { pattern: /^#\/profile$/, screen: profile },
  // Params: scope ('pack' | 'book') + its id — see revise.mount(root, scope, value).
  { pattern: /^#\/revise\/(pack|book)\/(\d+)$/, screen: revise },
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
  // The tab bar is the one place a tap changes the whole page from a fixed
  // control, so it gets a nudge. Every other [data-nav] is in-page and doesn't.
  if (nav.closest('.vt-bottomnav')) haptic.light();
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

// Only what the tab bar can't reach. This used to list every tab as well, which
// made four of its six rows a second copy of the bar directly beneath it.
function openMenu() {
  const item = (attrs, iconName, label) => `
    <button ${attrs} data-close class="w-full flex items-center gap-4 px-2 py-4 border-b border-progress-track text-on-surface active:bg-surface-container-low transition-colors">
      ${icon(iconName, 'text-primary')}
      <span class="text-body-md">${label}</span>
    </button>`;
  const { el, close } = showSheet(`
    <h2 class="text-headline-sm font-headline text-on-surface mb-4">VocabMaster</h2>
    ${item('data-nav="#/profile"', 'user', 'Profile')}
    ${item('data-nav="#/settings"', 'settings', 'Settings')}
    ${item('data-changelog', 'changelog', "What's new")}
    <button data-signout class="w-full flex items-center gap-4 px-2 py-4 text-on-surface-variant active:bg-surface-container-low transition-colors">
      ${icon('logout', 'text-on-surface-variant')}
      <span class="text-body-md">Sign out</span>
    </button>
  `);
  // Opened after this sheet closes, so the changelog isn't stacked on top of it.
  el.querySelector('[data-changelog]').addEventListener('click', () => {
    setTimeout(showChangelogSheet, 260);
  });
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
    ${logoTile()}
    <span class="text-headline-sm font-headline text-on-surface">VocabMaster</span>
  </div>`;

onAuthChange(() => {
  // Whoever is signed in now owns the header avatar — including nobody, which
  // clears it rather than leaving the previous user's face there.
  refreshProfileAvatar();
  if (!started) boot();
  else forceRender();
});

// If auth already resolved synchronously (rare) or after a tick, ensure boot.
if (!getAuthState().initializing) boot();
