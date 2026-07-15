// Auth session state. Mirrors the old React AuthProvider: exposes the current
// session, an initializing flag, and a subscribe() for the router to re-render
// on sign-in / sign-out.
import { supabase } from './supabase.js';

const state = { session: null, initializing: true };
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn(state));
}

supabase.auth
  .getSession()
  .then(({ data }) => {
    state.session = data.session;
  })
  .catch(() => {
    // Supabase unreachable / misconfigured — boot signed-out rather than hang.
    state.session = null;
  })
  .finally(() => {
    state.initializing = false;
    emit();
  });

supabase.auth.onAuthStateChange((_event, session) => {
  state.session = session;
  state.initializing = false;
  emit();
});

export function getAuthState() {
  return state;
}

export function isSignedIn() {
  return !!state.session;
}

export function onAuthChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function signOut() {
  await supabase.auth.signOut();
}
