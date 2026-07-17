import {
  acceptFriend, addFriendByCode, fetchFriends, fetchFriendStats, fetchMyCode, fetchMyStats,
  removeFriend,
} from '../api/friends.js';
import { haptic } from '../lib/feedback.js';
import {
  bindCodeInput, codeCells, confirmSheet, emptyState, esc, icon, keypad, showSheet, spinner,
  subHeader,
} from '../ui.js';

export function render() {
  return `
  ${subHeader('Friends')}
  <main class="pt-page pb-page-sub px-5">
    <div data-body class="flex flex-col gap-4">
      <div class="flex justify-center py-10">${spinner()}</div>
    </div>
  </main>`;
}

export function mount(root) {
  const body = root.querySelector('[data-body]');
  let disposeSheet = null;

  function draw() {
    Promise.all([fetchMyCode(), fetchFriends()])
      .then(([code, { accepted, incoming, outgoing }]) => {
        body.innerHTML = `
        ${myCodeCard(code)}

        <button data-add class="w-full h-[54px] rounded-full bg-primary text-on-primary text-body-md font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
          ${icon('person_add', 'text-[20px]')} Add a friend
        </button>

        ${incoming.length ? section('Requests', incoming.map(requestRow).join('')) : ''}
        ${accepted.length
          ? section('Your friends', accepted.map(friendRow).join(''))
          : emptyState('group', 'No friends yet', 'Share your code, or add someone else’s\nto compare progress.')}
        ${outgoing.length ? section('Waiting to be accepted', outgoing.map(pendingRow).join('')) : ''}`;

        bind();
      })
      .catch(() => {
        body.innerHTML = `<p class="text-body-sm text-error text-center py-10">Couldn't load your friends.</p>`;
      });
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
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try { await acceptFriend(btn.getAttribute('data-accept')); haptic.success(); draw(); }
        catch (err) { btn.disabled = false; errorSheet(err); }
      }));

    body.querySelectorAll('[data-remove]').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-remove');
        confirmSheet({
          title: 'Remove friend?',
          message: 'You will both stop seeing each other’s progress. You can reconnect with their code later.',
          confirmLabel: 'Remove',
          onConfirm: async () => {
            try { await removeFriend(id); draw(); } catch (err) { errorSheet(err); }
          },
        });
      }));

    body.querySelectorAll('[data-compare]').forEach((btn) =>
      btn.addEventListener('click', () => showCompareSheet(btn.getAttribute('data-compare'))));
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
          draw();
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

  async function showCompareSheet(friendId) {
    const { el } = showSheet(`
      <h2 class="text-headline-sm font-headline text-on-surface mb-4">Compare</h2>
      <div data-compare-body class="flex justify-center py-8">${spinner()}</div>`);
    const target = el.querySelector('[data-compare-body]');
    try {
      const [me, them] = await Promise.all([fetchMyStats(), fetchFriendStats(friendId)]);
      target.className = '';
      target.innerHTML = compareTable(me, them);
    } catch (err) {
      target.className = '';
      target.innerHTML = `<p class="text-body-sm text-error text-center py-6">${esc(String(err?.message || err))}</p>`;
    }
  }

  draw();
  return () => { disposeSheet?.(); };
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

function avatar(name) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return `
  <div class="w-10 h-10 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-headline text-[16px] shrink-0">${esc(initial)}</div>`;
}

function friendRow(f) {
  return `
  <div class="flex items-center gap-3 py-3 border-b border-progress-track last:border-0">
    <button data-compare="${esc(f.id)}" class="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70 transition-opacity">
      ${avatar(f.name)}
      <span class="text-body-md text-on-surface truncate flex-1">${esc(f.name)}</span>
      ${icon('chevron_right', 'text-outline-variant shrink-0')}
    </button>
    <button data-remove="${esc(f.id)}" aria-label="Remove ${esc(f.name)}" class="p-2 rounded-full text-on-surface-variant active:opacity-70 transition-opacity shrink-0">
      ${icon('close', 'text-[18px]')}
    </button>
  </div>`;
}

function requestRow(f) {
  return `
  <div class="flex items-center gap-3 py-3 border-b border-progress-track last:border-0">
    ${avatar(f.name)}
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
    ${avatar(f.name)}
    <span class="text-body-md text-on-surface-variant truncate flex-1">${esc(f.name)}</span>
    <button data-remove="${esc(f.id)}" aria-label="Cancel request" class="p-2 rounded-full text-on-surface-variant active:opacity-70 transition-opacity shrink-0">
      ${icon('close', 'text-[18px]')}
    </button>
  </div>`;
}

function compareTable(me, them) {
  const rows = [
    { label: 'Day streak', a: me.streak, b: them.streak },
    { label: 'Words mastered', a: me.mastered, b: them.mastered },
    { label: 'Attempts', a: me.attempts, b: them.attempts },
    { label: 'Accuracy', a: Math.round(me.accuracy * 100), b: Math.round(them.accuracy * 100), suffix: '%' },
  ];
  const cell = (v, win, suffix) => `
    <span class="flex-1 text-center font-mono text-[20px] ${win ? 'text-primary' : 'text-on-surface-variant'}">${v}${suffix ?? ''}</span>`;
  return `
  <div class="flex items-center gap-3 mb-3">
    <span class="flex-1 text-center text-label-sm uppercase text-on-surface-variant">You</span>
    <span class="w-24 shrink-0"></span>
    <span class="flex-1 text-center text-label-sm uppercase text-on-surface-variant truncate">${esc(them.name)}</span>
  </div>
  ${rows.map((r) => `
    <div class="flex items-center gap-3 py-2.5 border-b border-progress-track last:border-0">
      ${cell(r.a, r.a > r.b, r.suffix)}
      <span class="w-24 shrink-0 text-center text-body-sm text-on-surface-variant">${esc(r.label)}</span>
      ${cell(r.b, r.b > r.a, r.suffix)}
    </div>`).join('')}`;
}

function errorSheet(err) {
  showSheet(`
    <h2 class="text-headline-sm font-headline text-on-surface mb-2">Couldn't do that</h2>
    <p class="text-body-md text-on-surface-variant mb-4">${esc(String(err?.message || err))}</p>
    <button data-close class="w-full py-3 rounded-full bg-primary text-on-primary text-body-sm">OK</button>`);
}
