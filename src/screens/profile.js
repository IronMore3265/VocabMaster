// Profile: who you are in the app — your face, your name, your headline numbers.
// Reached from the avatar in the tab-page header, which replaced the settings
// gear; Settings is now a row here rather than a peer of it.
import { supabase } from '../supabase.js';
import { DISPLAY_NAME_MAX, updateAvatar, updateDisplayName } from '../api/account.js';
import { fetchMyProfile, fetchMyStats } from '../api/friends.js';
import { AVATAR_IDS, avatarTile } from '../avatars.js';
import { haptic } from '../lib/feedback.js';
import {
  bindCountUps, esc, field, icon, inputCls, refreshProfileAvatar, showSheet, spinner, statTile,
  subHeader,
} from '../ui.js';

function actionRow(iconName, label, attr) {
  return `
  <button ${attr} class="w-full flex items-center justify-between gap-3 py-3.5 text-left active:opacity-70 transition-opacity">
    <span class="flex items-center gap-3 text-body-md text-on-surface">${icon(iconName, 'text-primary')} ${esc(label)}</span>
    ${icon('chevron_right', 'text-outline-variant')}
  </button>`;
}

export function render() {
  return `
  ${subHeader('Profile')}
  <main class="pt-page pb-page-sub px-5 flex flex-col gap-4">
    <section data-identity class="bg-surface rounded-3xl p-6 flex flex-col items-center gap-3 shadow-card">
      <div class="flex justify-center py-8">${spinner()}</div>
    </section>

    <div data-stats class="flex gap-3"></div>

    <section class="bg-surface rounded-2xl px-5 py-1 shadow-card">
      ${actionRow('group', 'Friends', 'data-nav="#/friends"')}
      <div class="border-t border-progress-track">
        ${actionRow('settings', 'Settings', 'data-nav="#/settings"')}
      </div>
    </section>
  </main>`;
}

export function mount(root) {
  const identity = root.querySelector('[data-identity]');
  const statsEl = root.querySelector('[data-stats]');

  // The two reads are independent: a stats failure must not cost you the ability
  // to change your name, so they are not in one Promise.all.
  drawIdentity();
  drawStats();

  async function drawIdentity() {
    let profile;
    let email = '';
    try {
      const [p, userRes] = await Promise.all([fetchMyProfile(), supabase.auth.getUser()]);
      profile = p;
      email = userRes.data.user?.email ?? '';
    } catch {
      identity.innerHTML = `<p class="text-body-sm text-error text-center py-6">Couldn't load your profile.</p>`;
      return;
    }

    identity.innerHTML = `
      <button data-pick-avatar class="relative rounded-full active:scale-95 transition-transform" aria-label="Change avatar">
        ${avatarTile(profile.avatar, profile.display_name, { size: 96 })}
        <span class="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-on-primary border-2 border-surface flex items-center justify-center">
          ${icon('edit', 'text-[15px]')}
        </span>
      </button>
      <div class="flex flex-col items-center gap-1 min-w-0 w-full">
        <button data-edit-name class="flex items-center gap-2 max-w-full active:opacity-70 transition-opacity">
          <span data-display-name class="text-headline-sm font-headline text-on-surface truncate">${esc(profile.display_name || 'Add your name')}</span>
          ${icon('edit', 'text-primary text-[17px] shrink-0')}
        </button>
        <p class="text-body-sm text-on-surface-variant truncate max-w-full">${esc(email)}</p>
      </div>`;

    identity.querySelector('[data-edit-name]').addEventListener('click', () => {
      showEditNameSheet(profile.display_name || '', async (saved) => {
        profile.display_name = saved;
        // Patch in place rather than redrawing: a re-render would drop the
        // scroll position to change one line of text.
        identity.querySelector('[data-display-name]').textContent = saved;
        await refreshProfileAvatar();
      });
    });

    identity.querySelector('[data-pick-avatar]').addEventListener('click', () => {
      showAvatarSheet(profile.avatar, async (saved) => {
        profile.avatar = saved;
        drawIdentity();
        await refreshProfileAvatar();
      });
    });
  }

  async function drawStats() {
    try {
      const me = await fetchMyStats();
      statsEl.innerHTML = `
        ${statTile({ iconName: 'local_fire_department', countTo: me.streak, label: 'DAY STREAK' })}
        ${statTile({ iconName: 'workspace_premium', countTo: me.mastered, label: 'MASTERED' })}
        ${statTile({ iconName: 'task_alt', countTo: me.packs, label: 'PACKS DONE' })}`;
      bindCountUps(statsEl);
    } catch {
      statsEl.innerHTML = '';
    }
  }
}

// ---------- sheets ----------

function showAvatarSheet(current, onSaved) {
  const grid = AVATAR_IDS.map((id) => `
    <button data-avatar="${id}" class="rounded-full p-1 active:scale-95 transition-transform ${
      id === current ? 'ring-2 ring-primary' : ''
    }">
      ${avatarTile(id, '', { size: 62 })}
    </button>`).join('');

  const { el, close } = showSheet(`
    <h2 class="text-headline-sm font-headline text-on-surface mb-1">Choose an avatar</h2>
    <p class="text-body-sm text-on-surface-variant mb-5">Your friends see this next to your name.</p>
    <div data-grid class="grid grid-cols-4 gap-3 justify-items-center">${grid}</div>
    <p data-error class="text-body-sm text-error text-center mt-3 h-5"></p>`);

  const errorEl = el.querySelector('[data-error]');
  let saving = false;

  el.querySelector('[data-grid]').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-avatar]');
    if (!btn || saving) return;
    saving = true;
    errorEl.textContent = '';
    try {
      const saved = await updateAvatar(btn.getAttribute('data-avatar'));
      haptic.success();
      close();
      onSaved(saved);
    } catch (err) {
      errorEl.textContent = String(err?.message || err);
      saving = false;
    }
  });
}

function showEditNameSheet(current, onSaved) {
  const { el, close } = showSheet(`
    <h2 class="text-headline-sm font-headline text-on-surface mb-4">Edit name</h2>
    ${field('Display name', `<input data-name type="text" maxlength="${DISPLAY_NAME_MAX}" autocomplete="name" placeholder="Your name" class="${inputCls}" value="${esc(current)}" />`)}
    <p data-name-error class="text-body-sm text-error mt-2 hidden"></p>
    <div class="flex gap-3 mt-6">
      <button data-close class="flex-1 py-3 rounded-full border border-outline-variant text-on-surface text-body-sm">Cancel</button>
      <button data-save class="flex-1 py-3 rounded-full bg-primary text-on-primary text-body-sm">Save</button>
    </div>`);

  const input = el.querySelector('[data-name]');
  const errorEl = el.querySelector('[data-name-error]');
  const saveBtn = el.querySelector('[data-save]');
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  let saving = false;
  const save = async () => {
    if (saving) return;
    saving = true;
    errorEl.classList.add('hidden');
    saveBtn.disabled = true;
    saveBtn.classList.add('opacity-60');
    try {
      const saved = await updateDisplayName(input.value);
      onSaved(saved);
      close();
    } catch (err) {
      errorEl.textContent = String(err?.message || err);
      errorEl.classList.remove('hidden');
      saving = false;
      saveBtn.disabled = false;
      saveBtn.classList.remove('opacity-60');
    }
  };

  saveBtn.addEventListener('click', save);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
  });
}
