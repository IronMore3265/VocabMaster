// Offline awareness. Toggles an `is-offline` class on <html> — which greys and
// makes untappable every [data-online-only] entry point (see style.css) — and
// shows a bottom banner.
//
// On the web we use navigator.onLine + the online/offline events. Inside the
// Android WebView those are unreliable — navigator.onLine is often stale and the
// DOM events frequently never fire — so on native we drive everything off
// @capacitor/network (real connectivity + native change events). This is the one
// place a Capacitor plugin earns its keep over the web platform API.
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { icon } from '../ui.js';

// Routes that only work with a connection. Kept in sync with the [data-online-only]
// markers on the matching entry points; used as the nav-guard backstop in main.js.
export const ONLINE_ONLY_ROUTES = [/^#\/dictionary$/, /^#\/practice\//, /^#\/friends/];

// Last known status. Seeded from navigator.onLine, then kept authoritative by
// initOfflineWatch (from @capacitor/network on native, web events otherwise).
let currentOnline = navigator.onLine;

export function isOnline() {
  return currentOnline;
}

export function isOnlineOnlyRoute(hash) {
  return ONLINE_ONLY_ROUTES.some((re) => re.test(hash));
}

let barEl = null;

function setContent(bar, online) {
  bar.innerHTML = `
    <div class="flex items-center justify-center gap-2 px-4 py-2.5">
      ${icon(online ? 'cloud_done' : 'cloud_off', 'text-[18px]')}
      <span class="text-body-sm font-medium">${online
    ? "You're back online"
    : "You're offline — some features need a connection"}</span>
    </div>`;
}

function ensureBar() {
  if (barEl) return barEl;
  barEl = document.createElement('div');
  barEl.className = 'vt-offline-bar';
  barEl.setAttribute('role', 'status');
  barEl.setAttribute('aria-live', 'polite');
  setContent(barEl, false);
  document.body.appendChild(barEl);
  return barEl;
}

let wasOffline = false;
let backOnlineTimer = 0;

function apply(online) {
  currentOnline = online;
  document.documentElement.classList.toggle('is-offline', !online);
  const bar = ensureBar();
  clearTimeout(backOnlineTimer);
  if (!online) {
    wasOffline = true;
    bar.classList.remove('is-online');
    setContent(bar, false);
    bar.classList.add('is-visible');
    return;
  }
  if (!wasOffline) return; // boot while online — nothing to confirm
  wasOffline = false;
  // Flash a green "you're back" confirmation, then slide away.
  setContent(bar, true);
  bar.classList.add('is-online', 'is-visible');
  backOnlineTimer = setTimeout(() => {
    bar.classList.remove('is-visible');
    // Drop the green variant only after the 0.2s fade-out finishes.
    setTimeout(() => bar.classList.remove('is-online'), 250);
  }, 2500);
}

/** A quick attention pulse — used when a tap on a disabled control is blocked. */
export function flashOfflineBar() {
  const bar = ensureBar();
  if (!bar.classList.contains('is-visible')) return;
  bar.classList.remove('offline-pulse');
  void bar.offsetWidth; // restart the animation
  bar.classList.add('offline-pulse');
}

/** Wires the online/offline listeners and paints the initial state. Idempotent. */
let started = false;
export function initOfflineWatch() {
  if (started) return;
  started = true;

  if (Capacitor.isNativePlatform()) {
    // Native: @capacitor/network is authoritative (WebView events are flaky).
    Network.getStatus()
      .then((s) => apply(s.connected))
      .catch(() => apply(navigator.onLine));
    Network.addListener('networkStatusChange', (s) => apply(s.connected));
    return;
  }

  // Web: navigator.onLine + DOM events are reliable in a real browser.
  apply(navigator.onLine);
  window.addEventListener('online', () => apply(true));
  window.addEventListener('offline', () => apply(false));
}
