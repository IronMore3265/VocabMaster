// Shared UI building blocks, styled per the "Academic Clarity" design system.
import { iconSvg } from './icons.js';
import { getSettings, setSettings } from './store.js';
import { applyTheme } from './theme.js';

// Re-render the current route (main.js re-renders on hashchange).
export function rerender() {
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function icon(name, cls = '', solid = false) {
  return iconSvg(name, `${solid ? 'icon-solid' : ''} ${cls}`);
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ---------- top app bar: tab pages ----------
// The title is absolutely centered so the menu (left) and settings (right)
// icons sit on the same row, vertically aligned to the centered heading.
export function appHeader(title = 'VocabMaster') {
  return `
  <header class="pt-safe fixed top-0 w-full z-40 bg-background border-b border-progress-track transition-colors">
    <div class="relative flex items-center h-16 px-5">
      <button data-nav="menu" class="p-1 rounded text-primary active:opacity-70 transition-opacity shrink-0">
        ${icon('menu')}
      </button>
      <h1 class="absolute left-1/2 -translate-x-1/2 max-w-[60%] text-center text-headline-md font-headline text-on-surface truncate">${esc(title)}</h1>
      <button data-nav="#/settings" class="ml-auto p-1 rounded-full text-on-surface-variant active:opacity-70 transition-opacity shrink-0">
        ${icon('settings')}
      </button>
    </div>
  </header>`;
}

// ---------- top app bar: sub-pages ----------
export function subHeader(title = '', actionsHtml = '') {
  return `
  <header class="pt-safe fixed top-0 w-full z-40 bg-background border-b border-progress-track">
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
const TABS = [
  { route: '#/library', iconName: 'local_library', label: 'Library' },
  { route: '#/dictionary', iconName: 'dictionary', label: 'Dictionary' },
  { route: '#/practice/ai', iconName: 'auto_awesome', label: 'AI Coach' },
  { route: '#/analytics', iconName: 'monitoring', label: 'Analytics' },
];

export function bottomNav(activeRoute) {
  return `
  <nav class="pb-safe fixed bottom-0 left-0 w-full z-40 bg-background/95 backdrop-blur border-t border-progress-track">
    <div class="flex justify-around items-center h-[68px] px-4">
      ${TABS.map((t) => {
        const active = t.route === activeRoute;
        return `
        <button data-nav="${t.route}" class="flex flex-col items-center justify-center gap-1 w-full h-full active:scale-95 transition-[transform,color] duration-200 ${
          active ? 'text-primary' : 'text-on-surface-variant'
        }">
          ${icon(t.iconName, active ? 'icon-strong' : '')}
          <span class="text-[11px] font-medium">${t.label}</span>
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
    <div class="grow-x h-full rounded-full bg-primary-fixed-dim" style="width:${pct}%"></div>
  </div>`;
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
export function statTile({ iconName, value, label }) {
  return `
  <div class="flex-1 bg-surface rounded-lg p-4 flex flex-col gap-1.5 shadow-card">
    ${icon(iconName, 'text-primary text-[22px]')}
    <span class="font-mono text-[22px] leading-7 text-on-surface">${esc(value)}</span>
    <span class="text-label-sm text-on-surface-variant">${esc(label)}</span>
  </div>`;
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
export function chip(label, { active = false, attrs = '' } = {}) {
  return `<button ${attrs} class="rounded-full px-3.5 py-2 text-body-sm active:scale-95 transition-transform ${
    active ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container text-on-surface-variant'
  }">${esc(label)}</button>`;
}

// ---------- modal bottom sheet ----------
const openSheets = [];

export function closeTopSheet() {
  const top = openSheets[openSheets.length - 1];
  if (!top) return false;
  top();
  return true;
}

export function showSheet(innerHtml) {
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
