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
  dailyGoal: 100, // XP/day that a streak day requires (mirrors profiles.daily_goal)
  notifications: false, // local practice reminders (opt-in, needs OS permission)
  reminderHour: 20, // hour of day (0-23) for the daily streak reminder
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

// ---------- remembered sign-in email ----------
// "Remember me" persists only the email so the next sign-in prefills it and the
// user just types their password. The password is never stored.
export function getRememberedEmail() {
  return load('auth.email', '') || '';
}

export function setRememberedEmail(email) {
  save('auth.email', email || '');
}

export function clearRememberedEmail() {
  save('auth.email', '');
}

// ---------- streak celebration (once per day) ----------
// The full-screen fire fires the first time a day clears its XP goal; this stamps
// the day so re-opening the results screen doesn't replay it.
export function getStreakCelebratedDay() {
  return load('streak.celebratedDay', '') || '';
}

export function setStreakCelebratedDay(dayKey) {
  save('streak.celebratedDay', dayKey);
}

// ---------- friend requests seen (tab badge) ----------
export function getSeenRequestCount() {
  return load('friends.seenRequests', 0) || 0;
}

export function setSeenRequestCount(n) {
  save('friends.seenRequests', n);
}

// ---------- AI coach first-run explainer ----------
export function hasSeenAiIntro() {
  return load('ai.introSeen', false) === true;
}

export function setAiIntroSeen() {
  save('ai.introSeen', true);
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

// ---------- account deletion ----------
// Wipes everything tied to the person, leaving device preferences (theme,
// sound, haptics, onboarding) alone — those belong to the device, not the
// account. Deliberately not called on plain sign-out: "Remember me" exists to
// survive that.
export function clearLocalUserData() {
  clearRememberedEmail();
  save('ai.introSeen', false);
  save('dictionary.recent', []);
}
