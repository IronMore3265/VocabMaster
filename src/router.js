// Hash router. Screens are modules exporting render(...params) and an optional
// mount(root, ...params) that returns a cleanup function. main.js supplies the
// route table and the "can this route be shown?" gate via startRouter().
import { isDark } from './theme.js';

let routes = [];
let gate = () => null; // (hash) => redirectHash | null
let cleanup = null;
let prevHash = null;
const root = () => document.getElementById('app');

export function navigate(hash, { replace = false, force = false } = {}) {
  if (replace) {
    // Swap the current history entry (used for practice → results, so the
    // results "Done" back-navigates to the pack, not the finished exercise).
    location.replace(`${location.pathname}${location.search}${hash}`);
  } else if (location.hash === hash) {
    // Already here. Re-rendering would rebuild the page and lose scroll/state
    // just because the user tapped the tab they're on — only do it on request.
    if (force) render();
  } else {
    location.hash = hash;
  }
}

// Tab pages sit at depth 0, sub-pages deeper — used to pick a slide direction.
// Must list every tab in ui.js TABS, or a tab change animates as a drill-down.
const TAB_RE = /^#\/(library|dictionary|analytics|practice\/ai)$/;

function render() {
  const hash = location.hash || '#/library';

  const redirect = gate(hash);
  if (redirect && redirect !== hash) {
    location.hash = redirect;
    return;
  }

  const match = routes.find((r) => r.pattern.test(hash));
  if (!match) {
    location.hash = '#/library';
    return;
  }
  const params = hash.match(match.pattern).slice(1);

  const apply = () => {
    if (cleanup) { cleanup(); cleanup = null; }
    window.scrollTo(0, 0);
    const el = root();
    el.innerHTML = match.screen.render(...params);
    if (match.screen.mount) cleanup = match.screen.mount(el, ...params) || null;
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (document.startViewTransition && prevHash !== null && prevHash !== hash && !reduceMotion) {
    const fromDepth = TAB_RE.test(prevHash) ? 0 : 1;
    const toDepth = TAB_RE.test(hash) ? 0 : 1;
    document.documentElement.dataset.vt =
      toDepth > fromDepth ? 'forward' : toDepth < fromDepth ? 'back' : 'fade';
    document.startViewTransition(apply);
  } else {
    apply();
  }
  prevHash = hash;
}

export function startRouter({ routes: r, gate: g }) {
  routes = r;
  gate = g || (() => null);
  window.addEventListener('hashchange', render);
  render();
}

export function forceRender() {
  prevHash = null;
  render();
}

// exported for screens that want to know the theme (e.g. gradients)
export { isDark };
