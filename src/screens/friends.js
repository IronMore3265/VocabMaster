import {
  acceptFriend, addFriendByCode, fetchFriendFreezes, fetchFriends, fetchMutualStreaks,
  fetchMyCode, fetchMyStats, giftStreakFreeze, nudgeFriend, removeFriend,
} from '../api/friends.js';
import { invalidate } from '../api/queries.js';
import { avatarTile } from '../avatars.js';
import { navigate } from '../router.js';
import { setSeenRequestCount } from '../store.js';
import { haptic } from '../lib/feedback.js';
import { attachPullToRefresh } from '../lib/pullToRefresh.js';
import {
  appHeader, bindCodeInput, bottomNav, codeCells, confirmSheet, emptyState, esc, icon, keypad,
  showSheet, spinner,
} from '../ui.js';

export function render() {
  return `
  ${appHeader('Friends')}
  <main class="pt-page pb-page px-5">
    <div data-body class="flex flex-col gap-4">
      <div class="flex justify-center py-10">${spinner()}</div>
    </div>
  </main>
  ${bottomNav('#/friends')}`;
}

export function mount(root) {
  const body = root.querySelector('[data-body]');
  let disposeSheet = null;
  // Local model so optimistic actions can repaint instantly, then reconcile.
  let model = null;

  async function load() {
    try {
      const [code, lists, streaks, freezes, me] = await Promise.all([
        fetchMyCode(),
        fetchFriends(),
        fetchMutualStreaks().catch(() => new Map()),
        fetchFriendFreezes().catch(() => new Map()),
        // Only needed for "have I hit today's goal", which lights the fires.
        fetchMyStats().catch(() => null),
      ]);
      model = { code, ...lists, streaks, freezes, me };
      // Opening the tab counts the current requests as seen (clears the nav dot).
      setSeenRequestCount(lists.incoming.length);
      window.dispatchEvent(new CustomEvent('vm:friends-seen'));
      paint();
    } catch {
      body.innerHTML = `<p class="text-body-sm text-error text-center py-10">Couldn't load your friends.</p>`;
    }
  }

  function paint() {
    if (!model) return;
    const { code, accepted, incoming, outgoing, streaks, freezes, me } = model;
    const meToday = !!(me && me.todayXp >= me.goal);
    body.innerHTML = `
      ${myCodeCard(code)}

      <button data-add class="w-full h-[54px] rounded-full bg-primary text-on-primary text-body-md font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
        ${icon('person_add', 'text-[20px]')} Add a friend
      </button>

      ${incoming.length ? section('Requests', incoming.map(requestRow).join('')) : ''}
      ${accepted.length
        ? section('Your friends', accepted.map((f) => friendRow(f, streaks.get(f.id), freezes.get(f.id), meToday)).join(''))
        : emptyState('group', 'No friends yet', 'Share your code, or add someone else’s\nto compare progress.')}
      ${outgoing.length ? section('Waiting to be accepted', outgoing.map(pendingRow).join('')) : ''}`;
    bind();
  }

  function bind() {
    body.querySelector('[data-add]')?.addEventListener('click', showAddSheet);

    body.querySelector('[data-copy]')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      try {
        await navigator.clipboard.writeText(btn.getAttribute('data-copy'));
        haptic.light();
        const label = btn.querySelector('[data-copy-label]');
        label.textContent = 'Copied';
        setTimeout(() => { label.textContent = 'Copy'; }, 1600);
      } catch {
        // Clipboard is unavailable in some WebViews; the code is on screen anyway.
      }
    });

    body.querySelectorAll('[data-accept]').forEach((btn) =>
      btn.addEventListener('click', () => accept(btn.getAttribute('data-accept'))));

    body.querySelectorAll('[data-remove]').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-remove');
        confirmSheet({
          title: 'Remove friend?',
          message: 'You will both stop seeing each other’s progress. You can reconnect with their code later.',
          confirmLabel: 'Remove',
          onConfirm: () => remove(id),
        });
      }));

    body.querySelectorAll('[data-gift]').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-gift');
        const f = model?.accepted.find((x) => x.id === id);
        confirmSheet({
          title: 'Gift a streak freeze?',
          message: `${f ? f.name : 'Your friend'} gets one streak freeze to protect a missed day. You can gift them again in two weeks.`,
          confirmLabel: 'Gift freeze',
          onConfirm: () => gift(id),
        });
      }));

    body.querySelectorAll('[data-nudge]').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        nudge(btn.getAttribute('data-nudge'), btn);
      }));

    body.querySelectorAll('[data-compare]').forEach((btn) =>
      btn.addEventListener('click', () => navigate(`#/friends/compare/${btn.getAttribute('data-compare')}`)));
  }

  async function nudge(id, btn) {
    const f = model?.accepted.find((x) => x.id === id);
    if (btn) btn.disabled = true;
    try {
      await nudgeFriend(id);
      haptic.success();
      // Keep the button disabled for the rest of the session — the server caps it
      // at one nudge per day anyway.
      showSheet(`
        <h2 class="text-headline-sm font-headline text-on-surface mb-2">Nudge sent 👋</h2>
        <p class="text-body-md text-on-surface-variant mb-4">${esc(f ? f.name : 'Your friend')} will get a reminder to keep their streak going.</p>
        <button data-close class="w-full py-3 rounded-full bg-primary text-on-primary text-body-sm">Done</button>`);
    } catch (err) {
      if (btn) btn.disabled = false;
      errorSheet(err);
    }
  }

  // Optimistic: move the request into the friends list right away, then confirm.
  async function accept(id) {
    const req = model?.incoming.find((f) => f.id === id);
    if (!req) return;
    model.incoming = model.incoming.filter((f) => f.id !== id);
    model.accepted = [{ ...req, status: 'accepted' }, ...model.accepted];
    haptic.success();
    paint();
    try {
      await acceptFriend(id);
    } catch (err) {
      errorSheet(err);
      await load(); // reconcile from the server on failure
    }
  }

  async function gift(id) {
    const f = model?.accepted.find((x) => x.id === id);
    try {
      await giftStreakFreeze(id);
      haptic.success();
      // Reflect the recipient's new count so the button hides once they hit the cap.
      if (model?.freezes) model.freezes.set(id, Math.min(2, (model.freezes.get(id) ?? 0) + 1));
      paint();
      showSheet(`
        <h2 class="text-headline-sm font-headline text-on-surface mb-2">Freeze sent ❄️</h2>
        <p class="text-body-md text-on-surface-variant mb-4">${esc(f ? f.name : 'Your friend')} now has an extra streak freeze. Nice one.</p>
        <button data-close class="w-full py-3 rounded-full bg-primary text-on-primary text-body-sm">Done</button>`);
    } catch (err) {
      errorSheet(err);
    }
  }

  // Optimistic: drop the row from every list, then confirm.
  async function remove(id) {
    const prev = model;
    model = {
      ...model,
      accepted: model.accepted.filter((f) => f.id !== id),
      incoming: model.incoming.filter((f) => f.id !== id),
      outgoing: model.outgoing.filter((f) => f.id !== id),
    };
    paint();
    try {
      await removeFriend(id);
    } catch (err) {
      model = prev;
      paint();
      errorSheet(err);
    }
  }

  function showAddSheet() {
    // bindCodeInput listens on document for physical keys, so it must be torn
    // down however the sheet goes away — including a swipe dismiss.
    let input = null;
    const { el, close } = showSheet(`
      <h2 class="text-headline-sm font-headline text-on-surface mb-1">Add a friend</h2>
      <p class="text-body-sm text-on-surface-variant mb-5">Enter their 6-digit code.</p>
      ${codeCells({ label: 'Friend code' })}
      <p data-error class="text-body-sm text-error text-center mt-3 h-5"></p>
      <div class="mt-4">${keypad()}</div>`, {
      onClose: () => { input?.destroy(); disposeSheet = null; },
    });

    const errorEl = el.querySelector('[data-error]');
    let busy = false;

    input = bindCodeInput(el, {
      onChange: () => { errorEl.textContent = ''; },
      onComplete: async (code) => {
        if (busy) return;
        busy = true;
        try {
          await addFriendByCode(code);
          haptic.success();
          close();
          load();
        } catch (err) {
          errorEl.textContent = String(err?.message || err);
          input.shake();
          input.clear();
          busy = false;
        }
      },
    });
    disposeSheet = input.destroy;
  }

  // Live updates: a friend accepting/sending on their device flows in here.
  const onFriendsChanged = () => { invalidate('friends:list', 'friends:mutual'); load(); };
  window.addEventListener('vm:friends-changed', onFriendsChanged);
  const detachPull = attachPullToRefresh(async () => {
    invalidate('friends');
    await load();
  });

  load();
  return () => {
    disposeSheet?.();
    window.removeEventListener('vm:friends-changed', onFriendsChanged);
    detachPull();
  };
}

// ---------- pieces ----------

function section(title, inner) {
  return `
  <section class="bg-surface rounded-2xl px-5 py-1 shadow-card">
    <h2 class="text-label-sm uppercase text-on-surface-variant pt-4 pb-1">${esc(title)}</h2>
    ${inner}
  </section>`;
}

function myCodeCard(code) {
  const cells = [...String(code)].map((d) => `
    <span class="flex-1 max-w-[46px] aspect-[3/4] rounded-md border border-primary bg-surface flex items-center justify-center font-mono text-[22px] text-on-surface">${esc(d)}</span>`).join('');
  return `
  <section class="bg-surface rounded-3xl p-5 flex flex-col gap-3 shadow-card">
    <div class="flex items-center justify-between">
      <h2 class="text-label-sm uppercase text-on-surface-variant">Your code</h2>
      <button data-copy="${esc(code)}" class="flex items-center gap-1.5 text-primary text-body-sm active:opacity-70 transition-opacity">
        ${icon('content_copy', 'text-[16px]')}<span data-copy-label>Copy</span>
      </button>
    </div>
    <div class="flex justify-center gap-2">${cells}</div>
    <p class="text-body-sm text-on-surface-variant text-center">Share this so friends can add you.</p>
  </section>`;
}

const avatar = (f) => avatarTile(f.avatar, f.name, { size: 40 });

/**
 * The mutual streak flame: days in a row you and this friend BOTH hit your
 * goals. Today's completions light it — a cold stroked flame while neither of
 * you is done yet, flame-coloured on an amber field once one of you has hit
 * today's goal, and filled solid when you both have. Hidden only when there is
 * no streak and neither side is done today.
 */
function streakBadge(s = {}, meToday = false) {
  const days = s.streak ?? 0;
  const lit = (meToday ? 1 : 0) + (s.friendToday ? 1 : 0);
  if (!days && !lit) return '';
  const state = lit === 2 ? 'you’ve both hit today’s goal'
    : lit === 1 ? 'one of you has hit today’s goal'
      : 'neither of you has hit today’s goal yet';
  return `
  <span class="flex items-center gap-1 shrink-0 rounded-full ${lit ? 'bg-mastery/25' : 'bg-surface-container'} px-2 py-0.5"
        title="${days} day${days === 1 ? '' : 's'} you both hit your goal — ${state}">
    ${icon('local_fire_department', `${lit ? 'text-flame' : 'text-outline'} text-[14px]`, lit === 2)}
    ${days ? `<span class="font-mono text-[13px] leading-none ${lit ? 'text-flame' : 'text-on-surface-variant'}">${days}</span>` : ''}
  </span>`;
}

function friendRow(f, mutual, freezes, meToday) {
  // A friend can be gifted a freeze only when they hold fewer than the cap of 2.
  const canGift = typeof freezes === 'number' && freezes < 2;
  // Nudge a friend who hasn't finished today's goal yet (friendToday is false, or
  // unknown) — nothing to nudge about once they're done.
  const canNudge = !mutual?.friendToday;
  return `
  <div class="flex items-center gap-3 py-3 border-b border-progress-track last:border-0">
    <button data-compare="${esc(f.id)}" data-online-only class="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70 transition-opacity">
      ${avatar(f)}
      <span class="text-body-md text-on-surface truncate flex-1">${esc(f.name)}</span>
      ${streakBadge(mutual, meToday)}
      ${icon('chevron_right', 'text-outline-variant shrink-0')}
    </button>
    ${canNudge ? `
    <button data-nudge="${esc(f.id)}" data-online-only aria-label="Nudge ${esc(f.name)} to practise" title="Nudge to keep the streak"
      class="p-2 rounded-full text-primary active:opacity-70 transition-opacity shrink-0">
      ${icon('notifications', 'text-[18px]')}
    </button>` : ''}
    ${canGift ? `
    <button data-gift="${esc(f.id)}" aria-label="Gift ${esc(f.name)} a streak freeze" title="Gift a streak freeze"
      class="p-2 rounded-full text-primary active:opacity-70 transition-opacity shrink-0">
      ${icon('gift', 'text-[18px]')}
    </button>` : ''}
    <button data-remove="${esc(f.id)}" aria-label="Remove ${esc(f.name)}" class="p-2 rounded-full text-on-surface-variant active:opacity-70 transition-opacity shrink-0">
      ${icon('close', 'text-[18px]')}
    </button>
  </div>`;
}

function requestRow(f) {
  return `
  <div class="flex items-center gap-3 py-3 border-b border-progress-track last:border-0">
    ${avatar(f)}
    <div class="flex-1 min-w-0">
      <p class="text-body-md text-on-surface truncate">${esc(f.name)}</p>
      <p class="text-body-sm text-on-surface-variant">wants to connect</p>
    </div>
    <button data-accept="${esc(f.id)}" class="px-4 py-2 rounded-full bg-primary text-on-primary text-body-sm active:scale-95 transition-transform shrink-0 disabled:opacity-60">Accept</button>
    <button data-remove="${esc(f.id)}" aria-label="Decline" class="p-2 rounded-full text-on-surface-variant active:opacity-70 transition-opacity shrink-0">
      ${icon('close', 'text-[18px]')}
    </button>
  </div>`;
}

function pendingRow(f) {
  return `
  <div class="flex items-center gap-3 py-3 border-b border-progress-track last:border-0">
    ${avatar(f)}
    <span class="text-body-md text-on-surface-variant truncate flex-1">${esc(f.name)}</span>
    <button data-remove="${esc(f.id)}" aria-label="Cancel request" class="p-2 rounded-full text-on-surface-variant active:opacity-70 transition-opacity shrink-0">
      ${icon('close', 'text-[18px]')}
    </button>
  </div>`;
}

function errorSheet(err) {
  showSheet(`
    <h2 class="text-headline-sm font-headline text-on-surface mb-2">Couldn't do that</h2>
    <p class="text-body-md text-on-surface-variant mb-4">${esc(String(err?.message || err))}</p>
    <button data-close class="w-full py-3 rounded-full bg-primary text-on-primary text-body-sm">OK</button>`);
}
