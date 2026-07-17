// Light/dark theme. Preference lives in settings ('light'|'dark'|'system');
// 'system' follows the OS preference live.
import { getSettings } from './store.js';

const media = window.matchMedia('(prefers-color-scheme: dark)');

// --color-background, both themes (style.css).
const BG_LIGHT = '#f8f9fa';
const BG_DARK = '#121212';

export function isDark() {
  const pref = getSettings().theme;
  return pref === 'dark' || (pref === 'system' && media.matches);
}

export function applyTheme() {
  const dark = isDark();
  document.documentElement.classList.toggle('dark', dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? BG_DARK : BG_LIGHT);
  applyStatusBar(dark);
}

// The Android WebView ignores <meta name="theme-color">, so the native status
// bar has to be told separately or it stays light-on-light in light mode.
//
// Both calls must be awaited inside the chain: on the web the module imports
// fine and each call *rejects* ("not implemented on web"). Returning them lets
// the catch swallow it — otherwise every theme change logs an unhandled
// rejection in the browser.
function applyStatusBar(dark) {
  import('@capacitor/status-bar')
    .then(({ StatusBar, Style }) => Promise.all([
      // Style names the *background* it is meant for, not the text: Style.Dark
      // is "light text for dark backgrounds". Easy to get backwards.
      StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }),
      StatusBar.setBackgroundColor({ color: dark ? BG_DARK : BG_LIGHT }),
    ]))
    .catch(() => { /* not on native, or edge-to-edge ignores the colour — fine */ });
}

// Re-apply when the OS scheme flips while 'system' is selected.
media.addEventListener('change', () => {
  if (getSettings().theme === 'system') applyTheme();
});
