import { supabase } from '../supabase.js';
import { signOut } from '../auth.js';
import { getSettings, setSettings } from '../store.js';
import { deleteAccount } from '../api/account.js';
import { canInstallInApp, checkForUpdate, installUpdate, openExternal } from '../lib/updates.js';
import { CHANGELOG } from '../lib/changelog.js';
import {
  bindThemeChooser, bindToggles, confirmSheet, esc, icon, showSheet,
  subHeader, themeChooser, toggleRow,
} from '../ui.js';

function section(title, inner) {
  return `
  <section class="bg-surface rounded-2xl px-5 py-1 shadow-card">
    <h2 class="text-label-sm uppercase text-on-surface-variant pt-4 pb-1">${title}</h2>
    ${inner}
  </section>`;
}

function actionRow(iconName, label, attr, trailingHtml = '') {
  return `
  <button ${attr} class="w-full flex items-center justify-between gap-3 py-3.5 text-left active:opacity-70 transition-opacity">
    <span class="flex items-center gap-3 text-body-md text-on-surface">${icon(iconName, 'text-primary')} ${esc(label)}</span>
    ${trailingHtml}
  </button>`;
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
      <div class="border-t border-progress-track">
        ${actionRow('download', 'Check for updates', 'data-check-updates', '<span data-update-status class="text-body-sm text-on-surface-variant shrink-0"></span>')}
      </div>
      <div class="border-t border-progress-track">
        ${actionRow('changelog', "What's new", 'data-changelog', icon('chevron_right', 'text-outline-variant'))}
      </div>
    `)}

    <div class="flex flex-col items-center gap-3 mt-2">
      <button data-signout class="flex items-center gap-2 border border-outline-variant rounded-full px-6 py-3 text-on-surface-variant text-body-sm active:scale-95 transition-transform">
        ${icon('logout', 'text-[18px]')} Sign out
      </button>
      <button data-delete class="flex items-center gap-2 px-6 py-3 text-error text-body-sm active:scale-95 transition-transform">
        ${icon('delete', 'text-[18px]')} Delete account
      </button>
    </div>
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

  // ---------- check for updates ----------
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.2.0';
  const updateBtn = root.querySelector('[data-check-updates]');
  const updateStatus = root.querySelector('[data-update-status]');
  let checking = false;
  updateBtn.addEventListener('click', async () => {
    if (checking) return;
    checking = true;
    updateStatus.textContent = 'Checking…';
    try {
      const info = await checkForUpdate(version);
      if (info.hasUpdate) {
        updateStatus.innerHTML = `<span class="text-primary font-medium">v${esc(info.latest)}</span>`;
        showUpdateSheet(info);
      } else {
        updateStatus.textContent = 'Up to date';
      }
    } catch {
      updateStatus.textContent = 'Check failed';
    } finally {
      checking = false;
    }
  });

  // ---------- changelog ----------
  root.querySelector('[data-changelog]').addEventListener('click', showChangelogSheet);

  // ---------- delete account ----------
  root.querySelector('[data-delete]').addEventListener('click', () => {
    confirmSheet({
      title: 'Delete account?',
      message:
        'This permanently deletes your account and erases all your progress, bookmarks, and history from the server. This cannot be undone.',
      confirmLabel: 'Delete forever',
      onConfirm: async () => {
        try {
          await deleteAccount();
        } catch (err) {
          showSheet(`
            <h2 class="text-headline-sm font-headline text-on-surface mb-2">Couldn't delete account</h2>
            <p class="text-body-md text-on-surface-variant mb-4">${esc(String(err?.message || err))}</p>
            <button data-close class="w-full py-3 rounded-full bg-primary text-on-primary text-body-sm">OK</button>`);
          return;
        }
        // Account is gone — drop the local session and return to sign-in.
        signOut();
      },
    });
  });
}

function showUpdateSheet(info) {
  const inApp = canInstallInApp();
  const { el, close } = showSheet(`
    <div class="flex items-center gap-3 mb-2">
      ${icon('download', 'text-primary text-[26px]')}
      <h2 class="text-headline-sm font-headline text-on-surface">Update available</h2>
    </div>
    <p class="text-body-md text-on-surface-variant mb-1">A newer version <span class="font-medium text-on-surface">v${esc(info.latest)}</span> is available. You're on v${esc(info.current)}.</p>
    <p class="text-body-sm text-on-surface-variant mb-4">${inApp ? 'Download and install it right here.' : 'Download the latest build to update.'}</p>
    <div data-progress class="hidden mb-4">
      <div class="w-full rounded-full bg-progress-track overflow-hidden" style="height:8px">
        <div data-bar class="h-full rounded-full bg-primary transition-[width] duration-200" style="width:0%"></div>
      </div>
      <p data-dl-status class="text-label-sm text-on-surface-variant mt-2"></p>
    </div>
    <div class="flex gap-3">
      <button data-close class="flex-1 py-3 rounded-full border border-outline-variant text-on-surface text-body-sm">Later</button>
      <button data-download class="flex-1 py-3 rounded-full bg-primary text-on-primary text-body-sm flex items-center justify-center gap-2">${icon('download', 'text-[18px]')} ${inApp ? 'Update now' : 'Download'}</button>
    </div>`);

  const dl = el.querySelector('[data-download]');
  dl.addEventListener('click', async () => {
    // Non-Android (or plugin missing): open the download in the browser.
    if (!inApp) { openExternal(info.url); close(); return; }

    const progress = el.querySelector('[data-progress]');
    const bar = el.querySelector('[data-bar]');
    const status = el.querySelector('[data-dl-status]');
    dl.disabled = true;
    dl.classList.add('opacity-60');
    progress.classList.remove('hidden');
    status.textContent = 'Downloading…';
    try {
      await installUpdate(info.url, (p) => {
        const pct = Math.round(Math.min(1, Math.max(0, p)) * 100);
        bar.style.width = `${pct}%`;
        status.textContent = pct < 100 ? `Downloading… ${pct}%` : 'Opening installer…';
      });
      bar.style.width = '100%';
      status.textContent = 'Opening installer…';
      setTimeout(close, 1200);
    } catch {
      // Fall back to a plain browser download if the native path fails.
      status.textContent = 'Couldn’t install in-app — opening download…';
      setTimeout(() => { openExternal(info.url); close(); }, 1000);
    }
  });
}

function showChangelogSheet() {
  const body = CHANGELOG.map((rel) => `
    <div class="mb-5">
      <div class="flex items-baseline gap-2 mb-2">
        <span class="font-mono text-body-md text-on-surface">v${esc(rel.version)}</span>
        <span class="text-label-sm text-on-surface-variant">${esc(rel.date)}</span>
      </div>
      <ul class="flex flex-col gap-2">
        ${rel.notes.map((n) => `
        <li class="flex gap-2.5 text-body-sm text-on-surface-variant">
          <span class="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
          <span>${esc(n)}</span>
        </li>`).join('')}
      </ul>
    </div>`).join('');
  showSheet(`
    <h2 class="text-headline-sm font-headline text-on-surface mb-4">What's new</h2>
    ${body}`);
}
