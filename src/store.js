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
  reminderMinute: 0, // minute (0-59) for the daily streak reminder
  synAntMode: 'quick', // remembered Synonym/Antonym scope: 'quick' | 'full'
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

// ---------- level-up celebration (once per level) ----------
// The full-screen level-up fires the first time lifetime XP crosses into a new
// level; this stamps the highest level already celebrated so it doesn't replay.
export function getLevelCelebrated() {
  return load('level.celebrated', 0) || 0;
}

export function setLevelCelebrated(level) {
  save('level.celebrated', level);
}

// ---------- friend-streak celebration (per friend, once per day) ----------
// The two-avatars-and-a-fire moment fires when a mutual day with a friend
// completes; this stamps which friends were celebrated on which day so the
// post-session check never replays one.
export function getFriendStreaksCelebrated(dayKey) {
  const v = load('friendStreak.celebrated', null);
  return v && v.day === dayKey ? v.ids ?? [] : [];
}

export function addFriendStreakCelebrated(dayKey, friendId) {
  const ids = getFriendStreaksCelebrated(dayKey);
  save('friendStreak.celebrated', { day: dayKey, ids: [...new Set([...ids, friendId])] });
}

// ---------- freeze-gift celebration (watermark) ----------
// Realtime shows gifts that arrive while the app is open; this stamps the
// newest gift already celebrated so the boot/resume check only surfaces ones
// received while the app was closed, and never replays.
export function getFreezeGiftsSeenAt() {
  return load('freezeGifts.seenAt', '') || '';
}

export function setFreezeGiftsSeenAt(iso) {
  save('freezeGifts.seenAt', iso);
}

// ---------- exercise best times (device-local personal bests) ----------
// Fastest completion, in seconds, per pack + exercise type. Keyed "packId:type".
export function getBestTime(packId, type) {
  const map = load('practice.bestTimes', {});
  const v = map[`${packId}:${type}`];
  return typeof v === 'number' ? v : null;
}

/** Records `seconds` when it beats the stored best; returns true if it's a new best. */
export function setBestTimeIfBetter(packId, type, seconds) {
  const key = `${packId}:${type}`;
  const map = load('practice.bestTimes', {});
  const prev = map[key];
  if (typeof prev === 'number' && prev <= seconds) return false;
  map[key] = seconds;
  save('practice.bestTimes', map);
  return true;
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

// ---------- progress reset ----------
// Device state that mirrors server progress; cleared when the server-side
// history is reset so stale celebration stamps and best times don't survive
// the fresh start.
export function clearLocalProgressState() {
  save('streak.celebratedDay', '');
  save('level.celebrated', 0);
  save('practice.bestTimes', {});
  save('friendStreak.celebrated', null);
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
  clearLocalProgressState();
}
