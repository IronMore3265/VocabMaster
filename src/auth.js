// Auth session state. Mirrors the old React AuthProvider: exposes the current
// session, an initializing flag, and a subscribe() for the router to re-render
// on sign-in / sign-out.
import { supabase } from './supabase.js';
import { clearCache } from './api/queries.js';

const state = { session: null, initializing: true };
const listeners = new Set();

// Listeners re-render the whole app, so they must only hear about changes of
// *identity*. Supabase also fires TOKEN_REFRESHED periodically and on app
// refocus with the same user; those must stay silent or the screen rebuilds
// under the user mid-exercise.
let currentUserId = null;
let resolved = false;

function settle(session) {
  const nextUserId = session?.user?.id ?? null;
  const changed = nextUserId !== currentUserId;

  state.session = session;
  state.initializing = false;

  // A different user (or none) must not inherit the previous user's cached reads.
  if (changed) clearCache();

  currentUserId = nextUserId;
  if (!changed && resolved) return; // silent token refresh — nothing to redraw
  resolved = true;
  listeners.forEach((fn) => fn(state));
}

supabase.auth
  .getSession()
  .then(({ data }) => settle(data.session))
  .catch(() => settle(null)); // Supabase unreachable — boot signed-out rather than hang

supabase.auth.onAuthStateChange((_event, session) => settle(session));

export function getAuthState() {
  return state;
}

export function onAuthChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Ends the session. Pass { scope: 'local' } after the account row is already
 * gone — the server-side logout would reject the now-invalid JWT and throw.
 */
export async function signOut({ scope } = {}) {
  try {
    await supabase.auth.signOut(scope ? { scope } : undefined);
  } catch {
    // Never leave the user stuck on a dead session: fall through to the local
    // clear so onAuthStateChange still fires and the gate sends them to sign-in.
  }
  if (getAuthState().session) settle(null);
}
