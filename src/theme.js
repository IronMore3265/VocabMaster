// Light/dark theme. Preference lives in settings ('light'|'dark'|'system');
// 'system' follows the OS preference live.
import { getSettings } from './store.js';

const media = window.matchMedia('(prefers-color-scheme: dark)');

export function isDark() {
  const pref = getSettings().theme;
  return pref === 'dark' || (pref === 'system' && media.matches);
}

export function applyTheme() {
  const dark = isDark();
  document.documentElement.classList.toggle('dark', dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#101415' : '#f7f9fb');
}

// Re-apply when the OS scheme flips while 'system' is selected.
media.addEventListener('change', () => {
  if (getSettings().theme === 'system') applyTheme();
});
