// Shared UI building blocks, styled per the "Academic Clarity" design system.
import { iconSvg } from './icons.js';
import { getSettings, setSettings } from './store.js';
import { applyTheme } from './theme.js';
import { haptic } from './lib/feedback.js';
import { avatarTile } from './avatars.js';
import { fetchMyProfile } from './api/friends.js';
import { CHANGELOG } from './lib/changelog.js';

export function icon(name, cls = '', solid = false) {
  return iconSvg(name, `${solid ? 'icon-solid' : ''} ${cls}`);
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ---------- header profile avatar ----------
// appHeader is a synchronous string builder but the avatar comes from an async
// read, so the header renders from this snapshot and gets repainted in place
// once the profile lands. Without the snapshot the avatar would flash back to
// the initial-letter fallback on every navigation.
let profileSnapshot = null;

function paintProfileAvatars() {
  for (const el of document.querySelectorAll('[data-profile-avatar]')) {
    el.innerHTML = avatarTile(profileSnapshot?.avatar, profileSnapshot?.display_name, { size: 32 });
  }
}

/**
 * Re-reads the profile and repaints every rendered header avatar. Cheap to call
 * — fetchMyProfile() is cached, so this only hits the network after a write has
 * invalidated it. Call after changing the name or avatar, and on auth changes:
 * a signed-out read throws, which clears the snapshot rather than leaving the
 * previous user's face in the header.
 */
export async function refreshProfileAvatar() {
  try {
    profileSnapshot = await fetchMyProfile();
  } catch {
    profileSnapshot = null;
  }
  paintProfileAvatars();
}

// ---------- top app bar: tab pages ----------
// The title is absolutely centered so the menu (left) and profile (right)
// controls sit on the same row, vertically aligned to the centered heading.
export function appHeader(title = 'VocabMaster') {
  // Covers a cold render that beat the boot-time prime (or followed a failure);
  // a hit on the cache resolves without a request.
  if (!profileSnapshot) refreshProfileAvatar();
  return `
  <header class="vt-appbar pt-safe fixed top-0 w-full z-40 bg-background border-b border-progress-track transition-colors">
    <div class="relative flex items-center h-16 px-5">
      <button data-nav="menu" class="p-1 rounded text-primary active:opacity-70 transition-opacity shrink-0">
        ${icon('menu')}
      </button>
      <h1 class="absolute left-1/2 -translate-x-1/2 max-w-[60%] text-center text-headline-md font-headline text-on-surface truncate">${esc(title)}</h1>
      <button data-nav="#/profile" data-profile-avatar aria-label="Profile"
        class="ml-auto rounded-full active:opacity-70 transition-opacity shrink-0">
        ${avatarTile(profileSnapshot?.avatar, profileSnapshot?.display_name, { size: 32 })}
      </button>
    </div>
  </header>`;
}

// ---------- top app bar: sub-pages ----------
export function subHeader(title = '', actionsHtml = '') {
  return `
  <header class="vt-appbar pt-safe fixed top-0 w-full z-40 bg-background border-b border-progress-track">
    <div class="relative flex items-center h-16 px-2">
      <button data-nav="back" class="p-3 rounded-full text-on-surface active:opacity-70 transition-opacity shrink-0">
        ${icon('arrow_back')}
      </button>
      <h1 class="absolute left-1/2 -translate-x-1/2 max-w-[60%] text-center text-headline-md font-headline text-on-surface truncate">${esc(title)}</h1>
      <div class="ml-auto flex items-center shrink-0">${actionsHtml}</div>
    </div>
  </header>`;
}

// ---------- bottom navigation ----------
// Adding or removing a tab here must be mirrored in TAB_RE in router.js, or the
// new tab animates as a drill-down instead of a cross-fade.
const TABS = [
  { route: '#/library', iconName: 'local_library', label: 'Library' },
  { route: '#/dictionary', iconName: 'dictionary', label: 'Dictionary' },
  { route: '#/practice/ai', iconName: 'auto_awesome', label: 'AI Coach' },
  { route: '#/analytics', iconName: 'monitoring', label: 'Analytics' },
  { route: '#/friends', iconName: 'group', label: 'Friends' },
];

export function bottomNav(activeRoute) {
  return `
  <nav class="vt-bottomnav pb-safe fixed bottom-0 left-0 w-full z-40 bg-background/95 backdrop-blur border-t border-progress-track">
    <div class="flex justify-around items-center h-[68px] px-1">
      ${TABS.map((t) => {
        const active = t.route === activeRoute;
        return `
        <button data-nav="${t.route}" class="flex flex-col items-center justify-center gap-1 w-full h-full active:scale-95 transition-[transform,color] duration-200 ${
          active ? 'text-primary' : 'text-on-surface-variant'
        }">
          ${icon(t.iconName, active ? 'icon-strong' : '')}
          <span class="text-[10px] font-medium leading-none">${t.label}</span>
          <span class="w-1 h-1 rounded-full ${active ? 'bg-primary' : 'bg-transparent'}"></span>
        </button>`;
      }).join('')}
    </div>
  </nav>`;
}

// ---------- buttons ----------
export function primaryBtn(label, attrs = '', extra = '') {
  return `<button ${attrs} class="w-full h-[54px] rounded-full bg-primary text-on-primary text-body-md font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60 ${extra}">${label}</button>`;
}

export function ghostBtn(label, attrs = '') {
  return `<button ${attrs} class="px-6 py-3 rounded-full border border-outline-variant text-on-surface-variant text-body-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">${label}</button>`;
}

// ---------- form fields ----------
export const inputCls =
  'w-full px-4 py-3.5 rounded-xl border border-outline-variant bg-surface text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors';

export function field(label, inputHtml) {
  return `
  <label class="block">
    <span class="text-label-sm uppercase text-on-surface-variant block mb-2">${esc(label)}</span>
    ${inputHtml}
  </label>`;
}

// Password input with a peek toggle. `attrs` marks the input for the screen to
// query (e.g. 'data-password'); wire the eye button with bindPasswordPeek().
export function passwordField(attrs, { autocomplete = 'current-password', placeholder = 'Password' } = {}) {
  return `
  <div class="relative">
    <input ${attrs} type="password" autocomplete="${autocomplete}" placeholder="${esc(placeholder)}" class="${inputCls} pr-12" />
    <button type="button" data-peek aria-label="Show password" aria-pressed="false"
      class="absolute right-1.5 top-1/2 -translate-y-1/2 p-2.5 rounded-full text-on-surface-variant active:opacity-70 transition-opacity">
      ${icon('visibility')}
    </button>
  </div>`;
}

export function bindPasswordPeek(scope) {
  scope.querySelectorAll('[data-peek]').forEach((btn) => {
    const input = btn.parentElement.querySelector('input');
    if (!input) return;
    btn.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(show));
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      btn.innerHTML = icon(show ? 'visibility_off' : 'visibility');
    });
  });
}

// ---------- progress ----------
export function progressBar(ratio, { height = 8, className = '' } = {}) {
  const pct = Math.min(100, Math.max(0, ratio * 100));
  return `
  <div class="w-full rounded-full bg-progress-track overflow-hidden ${className}" style="height:${height}px">
    <div data-fill class="grow-x progress-fill h-full rounded-full bg-primary-fixed-dim" style="width:${pct}%"></div>
  </div>`;
}

/**
 * Retargets a rendered progressBar in place. Re-rendering the markup instead
 * would restart its grow-x entry animation, so the bar appears to reset on
 * every step rather than advancing.
 */
export function setProgress(scope, ratio) {
  const fill = scope?.querySelector('[data-fill]');
  if (fill) fill.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
}

export function progressRing({ progress = 0, size = 96, stroke = 10, label } = {}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, Math.max(0, progress)));
  const text = label ?? `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`;
  return `
  <div class="relative flex items-center justify-center" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" class="-rotate-90">
      <circle class="stroke-progress-track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"></circle>
      <circle data-ring class="stroke-primary-fixed-dim timer-ring" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none"
        stroke-width="${stroke}" stroke-linecap="round"
        stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"></circle>
    </svg>
    <span class="absolute font-mono text-on-surface" style="font-size:${Math.round(size / 5.3)}px">${text}</span>
  </div>`;
}

// ---------- cards / tiles ----------
/**
 * `countTo` (a number) makes the value tick up from zero once mounted — call
 * bindCountUps() on the container afterwards. Without it, `value` renders as-is.
 */
export function statTile({ iconName, value, label, countTo, suffix = '' }) {
  const animated = typeof countTo === 'number';
  const attrs = animated ? ` data-count-to="${countTo}" data-suffix="${esc(suffix)}"` : '';
  return `
  <div class="flex-1 bg-surface rounded-lg p-4 flex flex-col gap-1.5 shadow-card">
    ${icon(iconName, 'text-primary text-[22px]')}
    <span${attrs} class="font-mono text-[22px] leading-7 text-on-surface">${esc(animated ? `0${suffix}` : value)}</span>
    <span class="text-label-sm text-on-surface-variant">${esc(label)}</span>
  </div>`;
}

const REDUCE_MOTION = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Ticks every [data-count-to] in `scope` from 0 to its target. */
export function bindCountUps(scope, { duration = 900 } = {}) {
  const els = [...scope.querySelectorAll('[data-count-to]')];
  if (!els.length) return;
  const reduce = REDUCE_MOTION();

  for (const el of els) {
    const target = Number(el.getAttribute('data-count-to')) || 0;
    const suffix = el.getAttribute('data-suffix') ?? '';
    if (reduce || target === 0) {
      el.textContent = `${target}${suffix}`;
      continue;
    }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic: fast then settling, so the number lands rather than stops.
      const eased = 1 - (1 - t) ** 3;
      el.textContent = `${Math.round(target * eased)}${suffix}`;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

/**
 * Entry point to a revision session, for the pack and book screens.
 * `rev` is a pack_revision row (or an aggregate of them); returns '' when there
 * is nothing seen yet, since there'd be nothing to revise.
 */
export function reviseCard(route, rev) {
  const seen = Number(rev?.seen ?? 0);
  if (!rev || seen === 0) return '';
  const due = Number(rev.due ?? 0);
  const hint = due > 0
    ? `${due} word${due === 1 ? '' : 's'} due for review`
    : `${seen} word${seen === 1 ? '' : 's'} practised · oldest first`;
  return `
  <button data-nav="${route}" class="bg-surface rounded-3xl p-5 flex items-center gap-4 shadow-card active:scale-[0.98] transition-transform">
    <div class="w-11 h-11 rounded-full bg-primary-fixed flex items-center justify-center shrink-0 relative">
      ${icon('revise', 'text-primary')}
      ${due > 0 ? '<span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-surface"></span>' : ''}
    </div>
    <div class="flex-1 min-w-0 text-left">
      <p class="text-body-md text-on-surface">Revise</p>
      <p class="text-body-sm text-on-surface-variant truncate">${esc(hint)}</p>
    </div>
    ${icon('chevron_right', 'text-outline-variant shrink-0')}
  </button>`;
}

export function spinner(cls = 'text-primary') {
  return `<span class="inline-block w-6 h-6 rounded-full border-2 border-current border-t-transparent spin ${cls}"></span>`;
}

export function emptyState(iconName, title, hint) {
  return `
  <div class="flex flex-col items-center justify-center text-center py-12 px-8 gap-2">
    ${icon(iconName, 'text-[44px] text-outline-variant mb-1')}
    <p class="text-body-md text-on-surface font-medium">${esc(title)}</p>
    <p class="text-body-sm text-on-surface-variant whitespace-pre-line">${esc(hint)}</p>
  </div>`;
}

// ---------- chips ----------
// `tone` colours a chip by meaning (synonym / antonym). Active still wins — a
// selected chip reads as selected regardless of its category.
export const CHIP_TONES = {
  neutral: 'bg-surface-container text-on-surface-variant',
  positive: 'bg-secondary-container text-on-secondary-container',
  negative: 'bg-error-container text-on-error-container',
};

export function chip(label, { active = false, attrs = '', tone = 'neutral' } = {}) {
  return `<button ${attrs} class="rounded-full px-3.5 py-2 text-body-sm active:scale-95 transition-transform ${
    active ? 'bg-primary-fixed text-on-primary-fixed' : CHIP_TONES[tone] ?? CHIP_TONES.neutral
  }">${esc(label)}</button>`;
}

// ---------- code input + keypad ----------
// A fixed-length numeric entry built from buttons and a non-input display, so
// the Android keyboard never opens over it (and the WebView never resizes under
// it). Physical keyboards still work — see bindCodeInput.
export const CODE_LENGTH = 6;

export function codeCells({ length = CODE_LENGTH, label = 'Code' } = {}) {
  // rounded-md, not -xl: this theme's --radius-xl is 24px, which turns a 46px
  // cell into an oval.
  const cells = Array.from({ length }, (_, i) =>
    `<span data-cell="${i}" class="code-cell flex-1 max-w-[46px] aspect-[3/4] rounded-md border border-outline-variant bg-surface flex items-center justify-center font-mono text-[22px] text-on-surface"></span>`,
  ).join('');
  return `
  <div data-code role="group" aria-label="${esc(label)}" class="flex justify-center gap-2">${cells}</div>`;
}

export function keypad() {
  const key = (inner, attrs, extra = '') => `
    <button type="button" ${attrs} class="h-14 rounded-2xl bg-surface-container text-on-surface font-mono text-[22px] flex items-center justify-center active:scale-95 transition-transform ${extra}">${inner}</button>`;
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    .map((d) => key(String(d), `data-key="${d}" aria-label="${d}"`))
    .join('');
  return `
  <div data-keypad class="grid grid-cols-3 gap-2.5">
    ${digits}
    <span></span>
    ${key('0', 'data-key="0" aria-label="0"')}
    ${key(icon('backspace', 'text-[22px]'), 'data-key="del" aria-label="Delete"', 'bg-transparent text-on-surface-variant')}
  </div>`;
}

/**
 * Wires a codeCells + keypad pair. `onComplete(code)` fires when the last digit
 * lands; `onChange(code)` on every edit. Returns { get, clear, shake }.
 */
export function bindCodeInput(scope, { length = CODE_LENGTH, onComplete, onChange } = {}) {
  const wrap = scope.querySelector('[data-code]');
  const pad = scope.querySelector('[data-keypad]');
  let value = '';

  const paint = () => {
    [...wrap.querySelectorAll('[data-cell]')].forEach((cell, i) => {
      cell.textContent = value[i] ?? '';
      cell.classList.toggle('border-primary', i < value.length);
      // The caret marks where the next digit lands.
      cell.classList.toggle('code-cell-active', i === value.length);
    });
    onChange?.(value);
    if (value.length === length) onComplete?.(value);
  };

  const push = (d) => {
    if (value.length >= length) return;
    value += d;
    haptic.light();
    paint();
  };
  const pop = () => {
    if (!value) return;
    value = value.slice(0, -1);
    haptic.light();
    paint();
  };

  pad?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-key]');
    if (!btn) return;
    const k = btn.getAttribute('data-key');
    k === 'del' ? pop() : push(k);
  });

  // Physical keyboard (web / attached keyboards) — the on-screen pad is the
  // primary path, not the only one.
  const onKeydown = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) { push(e.key); e.preventDefault(); }
    else if (e.key === 'Backspace') { pop(); e.preventDefault(); }
  };
  document.addEventListener('keydown', onKeydown);

  paint();
  return {
    get: () => value,
    clear: () => { value = ''; paint(); },
    shake: () => {
      haptic.medium();
      wrap.classList.remove('shake');
      void wrap.offsetWidth; // restart the animation
      wrap.classList.add('shake');
    },
    destroy: () => document.removeEventListener('keydown', onKeydown),
  };
}

// ---------- modal bottom sheet ----------
const openSheets = [];

export function closeTopSheet() {
  const top = openSheets[openSheets.length - 1];
  if (!top) return false;
  top();
  return true;
}

/**
 * `onClose` runs whenever the sheet is actually removed — including the
 * backdrop tap and the swipe-to-dismiss path, which never call close(). Use it
 * to unbind anything the sheet attached outside its own DOM.
 */
export function showSheet(innerHtml, { onClose } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'fixed inset-0 z-50 flex items-end justify-center';
  wrap.innerHTML = `
    <div class="modal-backdrop absolute inset-0 bg-black/40" data-close></div>
    <div class="modal-sheet relative w-full max-w-lg bg-surface rounded-t-2xl p-6 pb-safe max-h-[85vh] overflow-y-auto">
      <div class="w-10 h-1 bg-outline-variant rounded-full mx-auto mb-4"></div>
      ${innerHtml}
      <div class="h-4"></div>
    </div>`;
  document.body.appendChild(wrap);

  const sheet = wrap.querySelector('.modal-sheet');
  const backdrop = wrap.querySelector('.modal-backdrop');
  let closed = false;

  const remove = () => {
    wrap.remove();
    const i = openSheets.indexOf(close);
    if (i !== -1) openSheets.splice(i, 1);
    onClose?.();
  };
  const close = () => {
    if (closed) return;
    closed = true;
    sheet.style.animation = 'sheetOut 0.25s cubic-bezier(0.4, 0, 1, 1) both';
    backdrop.style.animation = 'backdropOut 0.25s ease-out both';
    setTimeout(remove, 250);
  };
  openSheets.push(close);

  wrap.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) close();
  });

  // swipe-down to dismiss (only from the top of the scroll, not inside inputs)
  const NO_DRAG = 'textarea, input, select, [data-no-drag]';
  let startY = null, startT = 0, dragging = false;
  sheet.addEventListener('touchstart', (e) => {
    startY = null;
    if (closed || sheet.scrollTop > 0 || e.target.closest(NO_DRAG)) return;
    startY = e.touches[0].clientY;
    startT = Date.now();
    dragging = false;
  }, { passive: true });
  sheet.addEventListener('touchmove', (e) => {
    if (startY === null || closed) return;
    const dy = e.touches[0].clientY - startY;
    if (dy <= 0 && !dragging) { startY = null; return; }
    if (!dragging) { dragging = true; sheet.style.animation = 'none'; sheet.classList.add('is-dragging'); }
    sheet.style.transition = 'none';
    sheet.style.transform = `translateY(${Math.max(0, dy)}px)`;
    e.preventDefault();
  }, { passive: false });
  const endDrag = (e) => {
    if (startY === null || closed || !dragging) { startY = null; return; }
    const dy = e.changedTouches[0].clientY - startY;
    const dt = Date.now() - startT;
    startY = null; dragging = false; sheet.classList.remove('is-dragging');
    if (dy > sheet.offsetHeight * 0.25 || (dy > 60 && dt < 300)) {
      closed = true;
      sheet.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 1, 1)';
      sheet.style.transform = 'translateY(110%)';
      backdrop.style.animation = 'backdropOut 0.2s ease-out both';
      setTimeout(remove, 200);
    } else {
      sheet.style.transition = 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)';
      sheet.style.transform = 'translateY(0)';
    }
  };
  sheet.addEventListener('touchend', endDrag);
  sheet.addEventListener('touchcancel', endDrag);

  return { el: wrap, close };
}

/**
 * The release notes. Lives here rather than in the Settings screen because the
 * hamburger menu opens it too, and two copies of this markup would drift.
 */
export function showChangelogSheet() {
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

export function confirmSheet({ title, message, confirmLabel = 'Confirm', onConfirm }) {
  const { el, close } = showSheet(`
    <h2 class="text-headline-sm font-headline text-on-surface mb-2">${esc(title)}</h2>
    <p class="text-body-md text-on-surface-variant mb-6">${esc(message)}</p>
    <div class="flex gap-3">
      <button data-close class="flex-1 py-3 rounded-full border border-outline-variant text-on-surface text-body-sm">Cancel</button>
      <button data-confirm class="flex-1 py-3 rounded-full bg-error text-on-error text-body-sm">${esc(confirmLabel)}</button>
    </div>`);
  el.querySelector('[data-confirm]').addEventListener('click', () => { close(); onConfirm(); });
}

// ---------- toggle row ----------
export function toggleRow(label, key, on, { hint = '' } = {}) {
  return `
  <div class="flex items-center justify-between gap-3 py-3.5">
    <div class="min-w-0">
      <p class="text-body-md text-on-surface">${esc(label)}</p>
      ${hint ? `<p class="text-body-sm text-on-surface-variant">${esc(hint)}</p>` : ''}
    </div>
    <button type="button" role="switch" aria-checked="${on}" data-toggle="${key}"
      class="toggle-track relative w-12 h-7 rounded-full shrink-0 ${on ? 'bg-primary' : 'bg-progress-track'}">
      <span class="toggle-knob absolute top-1 w-5 h-5 rounded-full bg-white shadow" style="left:${on ? '22px' : '4px'}"></span>
    </button>
  </div>`;
}

export function bindToggles(scope, onChange) {
  scope.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-checked') !== 'true';
      btn.setAttribute('aria-checked', String(on));
      btn.classList.toggle('bg-primary', on);
      btn.classList.toggle('bg-progress-track', !on);
      const knob = btn.querySelector('.toggle-knob');
      if (knob) knob.style.left = on ? '22px' : '4px';
      onChange(btn.getAttribute('data-toggle'), on);
    });
  });
}

// ---------- theme chooser (shared by Settings + onboarding) ----------
const THEMES = [
  { id: 'light', icon: 'light', label: 'Light' },
  { id: 'dark', icon: 'dark', label: 'Dark' },
  { id: 'system', icon: 'theme_auto', label: 'System' },
];

const themeBtnCls = (active) =>
  `flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all duration-200 ${
    active ? 'bg-primary text-on-primary border-transparent' : 'border-outline-variant text-on-surface-variant'
  }`;

export function themeChooser() {
  const cur = getSettings().theme;
  return `
  <div class="flex gap-2" data-theme-group>
    ${THEMES.map((t) => `
    <button type="button" data-theme="${t.id}" class="${themeBtnCls(cur === t.id)}">
      ${icon(t.icon)}
      <span class="text-label-sm">${t.label}</span>
    </button>`).join('')}
  </div>`;
}

export function bindThemeChooser(scope) {
  const group = scope.querySelector('[data-theme-group]');
  if (!group) return;
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme]');
    if (!btn) return;
    setSettings({ theme: btn.getAttribute('data-theme') });
    applyTheme();
    group.querySelectorAll('[data-theme]').forEach((b) => { b.className = themeBtnCls(b === btn); });
  });
}
