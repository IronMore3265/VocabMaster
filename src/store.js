// Local device state (onboarding flag, theme, recent dictionary searches).
// Server-synced data (packs, progress, bookmarks) lives in Supabase, not here.
const PREFIX = 'vm.';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('vm:changed', { detail: { key } }));
}

// ---------- settings ----------
const DEFAULT_SETTINGS = {
  theme: 'system', // 'light' | 'dark' | 'system'
  sound: true, // pronunciation audio playback
  haptics: true, // vibration feedback on answers (Android)
};

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...load('settings', {}) };
}

export function setSettings(patch) {
  save('settings', { ...getSettings(), ...patch });
}

// ---------- onboarding ----------
export function isOnboarded() {
  return load('onboarded', false) === true;
}

export function setOnboarded(value = true) {
  save('onboarded', value);
}

// ---------- recent dictionary searches ----------
const RECENT_MAX = 8;

export function getRecentSearches() {
  return load('dictionary.recent', []);
}

export function pushRecentSearch(word) {
  const current = getRecentSearches();
  const next = [word, ...current.filter((w) => w !== word)].slice(0, RECENT_MAX);
  save('dictionary.recent', next);
  return next;
}

export function clearRecentSearches() {
  save('dictionary.recent', []);
}
