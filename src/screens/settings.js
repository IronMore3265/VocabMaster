import { supabase } from '../supabase.js';
import { signOut } from '../auth.js';
import { getSettings, setSettings } from '../store.js';
import {
  bindThemeChooser, bindToggles, confirmSheet, esc, icon, subHeader, themeChooser, toggleRow,
} from '../ui.js';

function section(title, inner) {
  return `
  <section class="bg-surface rounded-2xl px-5 py-1 shadow-card">
    <h2 class="text-label-sm uppercase text-on-surface-variant pt-4 pb-1">${title}</h2>
    ${inner}
  </section>`;
}

export function render() {
  const s = getSettings();
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.2.0';
  return `
  ${subHeader('Settings')}
  <main class="pt-page pb-page-sub px-5 flex flex-col gap-4">
    <div data-account></div>

    ${section('Appearance', `<div class="py-3">${themeChooser()}</div>`)}

    ${section('Practice', `
      ${toggleRow('Pronunciation audio', 'sound', s.sound, { hint: 'Play Merriam-Webster audio clips' })}
      ${toggleRow('Haptic feedback', 'haptics', s.haptics, { hint: 'Vibrate on correct / wrong answers' })}
    `)}

    ${section('About', `
      <div class="flex items-center justify-between py-3.5">
        <span class="text-body-md text-on-surface">Version</span>
        <span class="font-mono text-body-sm text-on-surface-variant">${esc(version)}</span>
      </div>
    `)}

    <button data-signout class="self-center mt-2 flex items-center gap-2 border border-outline-variant rounded-full px-6 py-3 text-on-surface-variant text-body-sm active:scale-95 transition-transform">
      ${icon('logout', 'text-[18px]')} Sign out
    </button>
  </main>`;
}

export function mount(root) {
  bindThemeChooser(root);
  bindToggles(root, (key, on) => setSettings({ [key]: on }));

  // Account card — filled once the user is known.
  supabase.auth.getUser().then(({ data }) => {
    const email = data.user?.email;
    if (!email) return;
    const el = root.querySelector('[data-account]');
    el.innerHTML = `
    <section class="bg-surface rounded-2xl p-5 flex items-center gap-3 shadow-card">
      <div class="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center shrink-0">
        ${icon('user', 'text-primary text-[26px]')}
      </div>
      <div class="min-w-0">
        <p class="text-body-md text-on-surface truncate">${esc(data.user.user_metadata?.display_name || 'Signed in')}</p>
        <p class="text-body-sm text-on-surface-variant truncate">${esc(email)}</p>
      </div>
    </section>`;
  });

  root.querySelector('[data-signout]').addEventListener('click', () => {
    confirmSheet({
      title: 'Sign out?',
      message: 'Your progress stays synced to your account.',
      confirmLabel: 'Sign out',
      onConfirm: () => signOut(),
    });
  });
}
