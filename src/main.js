import './style.css';

import { forceRender, navigate, startRouter } from './router.js';
import { getAuthState, onAuthChange, signOut } from './auth.js';
import { getSeenRequestCount, getSettings, isOnboarded } from './store.js';
import { applyTheme } from './theme.js';
import { logoTile } from './brand.js';
import {
  closeTopSheet, icon, refreshProfileAvatar, setUnseenRequests, showChangelogSheet, showSheet,
} from './ui.js';
import { haptic } from './lib/feedback.js';
import { runLeaveGuard } from './lib/leaveGuard.js';
import {
  pauseFriendsRealtime, resumeFriendsRealtime, startFriendsRealtime, stopFriendsRealtime,
} from './api/realtime.js';
import { fetchStreakState } from './api/queries.js';
import { fetchFriends, fetchMyStats } from './api/friends.js';
import { syncDailyGoal } from './api/account.js';
import { cancelAllReminders, ensurePermission, rescheduleReminders } from './lib/notifications.js';
import {
  checkMissedFreezeGifts, markFreezeGiftSeen, primeLevelBaseline, showFreezeGiftCelebration,
} from './lib/streakCelebration.js';
import { flashOfflineBar, initOfflineWatch, isOnlineOnlyRoute } from './lib/offline.js';

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
import * as compare from './screens/compare.js';
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
  { pattern: /^#\/results\/(\d+)\/(\d+)(?:\/(\w+))?$/, screen: results },
  { pattern: /^#\/settings$/, screen: settings },
  { pattern: /^#\/friends$/, screen: friends },
  { pattern: /^#\/friends\/compare\/([0-9a-fA-F-]+)$/, screen: compare },
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
    // An exercise in progress can intercept this to confirm leaving.
    if (runLeaveGuard()) return;
    if (history.length > 1) history.back();
    else navigate('#/library');
  } else if (target === 'menu') {
    openMenu();
  } else {
    // Backstop for the CSS gating: a network-only route can't be opened while
    // offline (covers any programmatic path the pointer-events rule misses).
    if (!navigator.onLine && isOnlineOnlyRoute(target)) { flashOfflineBar(); return; }
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

// ---------- per-session bootstrap ----------
// Runs when the signed-in identity changes: live friend updates, the daily-goal
// sync, streak-state priming, notification reminders, and the Friends tab dot.
let bootstrappedUser = null;

async function refreshRemindersAndBadge() {
  try {
    const [me, lists] = await Promise.all([
      fetchMyStats().catch(() => null),
      fetchFriends().catch(() => ({ incoming: [] })),
    ]);
    setUnseenRequests((lists.incoming?.length ?? 0) > getSeenRequestCount());
    if (getSettings().notifications) {
      // Surface the OS permission prompt on launch/resume when reminders are on but
      // permission is missing — the user opted in, so keep asking until the OS
      // stops allowing prompts. Runs even offline (me === null), where there are
      // no fresh stats to schedule against but the prompt must still appear.
      const allowed = await ensurePermission();
      if (allowed && me) {
        await rescheduleReminders({ streak: me.streak, goalMet: me.todayXp >= me.goal });
      }
    }
  } catch { /* best-effort */ }
}

async function bootstrapSession() {
  const userId = getAuthState().session?.user?.id ?? null;
  if (userId === bootstrappedUser) return;
  bootstrappedUser = userId;
  if (!userId) {
    stopFriendsRealtime();
    setUnseenRequests(false);
    cancelAllReminders();
    return;
  }
  startFriendsRealtime(userId);
  try { await syncDailyGoal(); } catch { /* offline — device setting stands */ }
  fetchStreakState().catch(() => {}); // prime + run the day-boundary freeze bookkeeping
  primeLevelBaseline(); // seed the level-up baseline before any session can pop it
  checkMissedFreezeGifts(); // gifts that arrived while the app was closed
  refreshRemindersAndBadge();
}

// A friend's action (realtime) or opening the Friends tab move the dot.
window.addEventListener('vm:friends-changed', refreshRemindersAndBadge);
window.addEventListener('vm:friends-seen', () => setUnseenRequests(false));
// A freeze arrived while the app is open — give it the full-screen moment, and
// stamp the watermark so the resume check doesn't replay it.
window.addEventListener('vm:freeze-received', (e) => {
  markFreezeGiftSeen(e.detail?.createdAt);
  showFreezeGiftCelebration({ from: e.detail?.name });
});

// ---------- Android hardware back button + app lifecycle ----------
import('@capacitor/app')
  .then(({ App }) => {
    App.addListener('backButton', ({ canGoBack }) => {
      if (closeTopSheet()) return;
      // An exercise in progress can intercept this to confirm leaving.
      if (runLeaveGuard()) return;
      const hash = location.hash || '#/library';
      if (hash === '#/library' || hash === '#/onboarding' || hash === '#/sign-in') App.exitApp();
      else if (canGoBack) history.back();
      else navigate('#/library');
    });
    // Close the realtime socket while backgrounded (battery); on resume reopen it
    // and re-check the streak/reminders, since a day may have rolled over.
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        resumeFriendsRealtime();
        if (getAuthState().session) {
          fetchStreakState().catch(() => {});
          checkMissedFreezeGifts(); // a friend may have gifted while backgrounded
          refreshRemindersAndBadge();
        }
      } else {
        pauseFriendsRealtime();
      }
    });
  })
  .catch(() => { /* not on native — fine */ });

// ---------- boot ----------
applyTheme();
initOfflineWatch();

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
  bootstrapSession();
  if (!started) boot();
  else forceRender();
});

// If auth already resolved synchronously (rare) or after a tick, ensure boot.
if (!getAuthState().initializing) boot();
