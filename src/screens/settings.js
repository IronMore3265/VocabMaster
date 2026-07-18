import { supabase } from '../supabase.js';
import { signOut } from '../auth.js';
import { clearLocalUserData, getSettings, setSettings } from '../store.js';
import { DAILY_GOALS, deleteAccount, updateDailyGoal } from '../api/account.js';
import { fetchMyProfile, fetchMyStats } from '../api/friends.js';
import { avatarTile } from '../avatars.js';
import { cancelAllReminders, ensurePermission, rescheduleReminders } from '../lib/notifications.js';
import { canInstallInApp, checkForUpdate, installUpdate, openExternal } from '../lib/updates.js';
import {
  bindThemeChooser, bindToggles, confirmSheet, esc, icon, showChangelogSheet, showSheet,
  subHeader, themeChooser, toggleRow,
} from '../ui.js';

const goalBtnCls = (active) =>
  `flex-1 flex flex-col items-center gap-0.5 py-3 rounded-xl border transition-all duration-200 ${
    active ? 'bg-primary text-on-primary border-transparent' : 'border-outline-variant text-on-surface-variant'
  }`;

function goalChooser(current) {
  return `
  <div class="flex gap-2" data-goal-group>
    ${DAILY_GOALS.map((g) => `
    <button type="button" data-goal="${g.value}" class="${goalBtnCls(g.value === current)}">
      <span class="text-body-md font-medium">${g.label}</span>
      <span class="font-mono text-label-sm">${g.value} XP</span>
    </button>`).join('')}
  </div>`;
}

function hourSelect(current) {
  const opts = Array.from({ length: 24 }, (_, h) => {
    const label = `${String(h).padStart(2, '0')}:00`;
    return `<option value="${h}" ${h === current ? 'selected' : ''}>${label}</option>`;
  }).join('');
  return `<select data-reminder-hour class="bg-surface-container rounded-lg px-3 py-2 text-body-md text-on-surface">${opts}</select>`;
}

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

    ${section('Daily goal', `
      <div class="py-3">${goalChooser(s.dailyGoal)}</div>
      <p class="text-body-sm text-on-surface-variant pb-3">Earn this much XP in a day to keep your streak going.</p>
    `)}

    ${section('Notifications', `
      ${toggleRow('Practice reminders', 'notifications', s.notifications, { hint: 'A daily nudge to protect your streak' })}
      <div data-reminder-time class="${s.notifications ? '' : 'hidden'} border-t border-progress-track flex items-center justify-between py-3.5">
        <span class="text-body-md text-on-surface">Remind me at</span>
        ${hourSelect(s.reminderHour)}
      </div>
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

    <div class="flex flex-col items-center gap-1 mt-4 mb-2 text-center">
      <p class="text-body-sm text-on-surface-variant">
        Developed &amp; created by <strong class="font-medium text-on-surface">Nabil Fuad Raiyan</strong>
      </p>
      <p class="font-mono text-label-sm text-on-surface-variant">
        <span class="text-[18px] align-middle leading-none">©</span> 2026 Nabil Fuad Raiyan. All rights reserved.
      </p>
    </div>
  </main>`;
}

export function mount(root) {
  bindThemeChooser(root);

  // Recomputes today's state and (re)schedules the local reminders accordingly.
  async function reschedule() {
    try {
      const me = await fetchMyStats();
      await rescheduleReminders({ streak: me.streak, goalMet: me.todayXp >= me.goal });
    } catch {
      await rescheduleReminders({});
    }
  }

  const reminderTime = root.querySelector('[data-reminder-time]');
  bindToggles(root, async (key, on) => {
    if (key === 'notifications') {
      // Honour the user's choice immediately and keep the switch where they left it —
      // never flip it back. If the OS hasn't granted permission we simply guide them
      // to enable it; the reminder scheduler already no-ops safely until it's granted.
      setSettings({ notifications: on });
      reminderTime?.classList.toggle('hidden', !on);
      if (!on) { cancelAllReminders(); return; }
      if (await ensurePermission()) {
        reschedule();
      } else {
        showSheet(`
          <h2 class="text-headline-sm font-headline text-on-surface mb-2">Allow notifications</h2>
          <p class="text-body-md text-on-surface-variant mb-4">Practice reminders are on, but VocabMaster can’t send them until you allow notifications for it in your device settings.</p>
          <button data-close class="w-full py-3 rounded-full bg-primary text-on-primary text-body-sm">OK</button>`);
      }
      return;
    }
    setSettings({ [key]: on });
  });

  // ---------- daily goal ----------
  const goalGroup = root.querySelector('[data-goal-group]');
  goalGroup?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-goal]');
    if (!btn) return;
    const value = Number(btn.getAttribute('data-goal'));
    if (value === getSettings().dailyGoal) return;
    goalGroup.querySelectorAll('[data-goal]').forEach((b) => {
      b.className = goalBtnCls(Number(b.getAttribute('data-goal')) === value);
    });
    try {
      await updateDailyGoal(value);
      reschedule();
    } catch (err) {
      // Revert the selection on failure.
      const cur = getSettings().dailyGoal;
      goalGroup.querySelectorAll('[data-goal]').forEach((b) => {
        b.className = goalBtnCls(Number(b.getAttribute('data-goal')) === cur);
      });
      showSheet(`
        <h2 class="text-headline-sm font-headline text-on-surface mb-2">Couldn't save goal</h2>
        <p class="text-body-md text-on-surface-variant mb-4">${esc(String(err?.message || err))}</p>
        <button data-close class="w-full py-3 rounded-full bg-primary text-on-primary text-body-sm">OK</button>`);
    }
  });

  // ---------- reminder time ----------
  root.querySelector('[data-reminder-hour]')?.addEventListener('change', (e) => {
    setSettings({ reminderHour: Number(e.target.value) });
    reschedule();
  });

  // Account card — a way through to Profile, which owns identity now. Editing
  // the name lives there; two places to rename yourself is one too many.
  // Reads the profiles row rather than the JWT so the name and avatar come from
  // one store (see updateAvatar in api/account.js).
  const accountEl = root.querySelector('[data-account]');
  Promise.all([fetchMyProfile(), supabase.auth.getUser()]).then(([profile, userRes]) => {
    const email = userRes.data.user?.email;
    if (!email) return;
    accountEl.innerHTML = `
    <button data-nav="#/profile" class="w-full bg-surface rounded-2xl p-5 flex items-center gap-3 shadow-card text-left active:opacity-70 transition-opacity">
      ${avatarTile(profile.avatar, profile.display_name, { size: 48 })}
      <div class="min-w-0 flex-1">
        <p class="text-body-md text-on-surface truncate">${esc(profile.display_name || 'Signed in')}</p>
        <p class="text-body-sm text-on-surface-variant truncate">${esc(email)}</p>
      </div>
      ${icon('chevron_right', 'text-outline-variant shrink-0')}
    </button>`;
  }).catch(() => { /* offline — the rest of Settings still works */ });

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
        // The account row is gone, so the server would reject a normal logout —
        // clear locally. Await it so the router's gate sees a dropped session
        // rather than racing it.
        clearLocalUserData();
        await signOut({ scope: 'local' });
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

