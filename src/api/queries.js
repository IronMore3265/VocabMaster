import { supabase } from '../supabase.js';

/**
 * The device's IANA timezone, for RPCs that bucket timestamps into days.
 * computeStreak() below buckets device-local, so any streak the server computes
 * has to be told which zone that is or the two disagree by a day. An IANA name
 * rather than an offset: an offset applied to historical rows mis-buckets
 * everything on the far side of a DST change.
 */
export const DEVICE_TZ = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC'; // ancient WebView — the RPC defaults to UTC anyway
  }
})();

// ---------- XP ----------
// The single client-side source of XP truth; mirrors xp_for() in migration 0011.
// Flashcards are self-graded and cheap (a full pack tops out at ~40 XP, below the
// Regular goal), so real recall exercises are what actually move the streak. Every
// logged flashcard is worth a flat 2 XP — "Again" just re-studies the card and never
// records an attempt, so a flashcard is never a "miss".
export const XP_WEIGHTS = {
  flashcard: { correct: 2, wrong: 2 },
  default: { correct: 5, wrong: 1 },
};

export function xpFor(type, correct) {
  const w = XP_WEIGHTS[type] ?? XP_WEIGHTS.default;
  return correct ? w.correct : w.wrong;
}

/** Local calendar-day key (device zone), matching the server's tz bucketing. */
export function localDayKey(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Sum XP per local day from attempt events → Map<dayKey, xp>. */
export function dailyXp(events) {
  const map = new Map();
  for (const e of events) {
    const k = localDayKey(e.at);
    map.set(k, (map.get(k) ?? 0) + xpFor(e.type, e.correct));
  }
  return map;
}

export function totalXp(events) {
  let sum = 0;
  for (const e of events) sum += xpFor(e.type, e.correct);
  return sum;
}

/**
 * Level from lifetime XP. Each level costs more than the last (level L starts at
 * 100·(L−1)² XP), so early levels come fast and later ones are a grind.
 */
export function levelForXp(xp) {
  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
  const floor = 100 * (level - 1) ** 2;
  const ceil = 100 * level ** 2;
  return { level, floor, ceil, into: xp - floor, span: ceil - floor };
}

// ---------- tiny promise cache ----------
// Replaces react-query: memoises in-flight/resolved promises by key so screens
// can call freely, and clears keys after a write so progress re-reads fresh.
// An optional ttlMs makes an entry go stale on its own — used for friend-sourced
// reads that another device can change without our knowing to invalidate.
const cache = new Map();

export function cached(key, fn, ttlMs = 0) {
  const hit = cache.get(key);
  if (hit && !(ttlMs > 0 && Date.now() - hit.at > ttlMs)) {
    return hit.promise;
  }
  const promise = fn().catch((err) => {
    if (cache.get(key)?.promise === promise) cache.delete(key); // let a failed fetch retry
    throw err;
  });
  cache.set(key, { promise, at: Date.now() });
  return promise;
}

export function invalidate(...prefixes) {
  for (const k of [...cache.keys()]) {
    if (prefixes.some((p) => k.startsWith(p))) cache.delete(k);
  }
}

/**
 * Drops every cached read. Called on sign-out / account deletion / a switch to a
 * different user — the cache is module state that otherwise outlives the session
 * and would serve the previous user's progress to the next one.
 * (invalidate() with no prefixes is a no-op by design, so it can't do this.)
 */
export function clearCache() {
  cache.clear();
}

// ---------- reads ----------

/** Static pack metadata (85 packs; never changes). */
export function fetchPacks() {
  return cached('packs', async () => {
    const { data, error } = await supabase
      .from('packs')
      .select('*')
      .order('book')
      .order('pack_number');
    if (error) throw error;
    return data;
  });
}

/** Per-pack mastered/seen counts for the current user (pack_progress view). */
export function fetchPackProgress() {
  return cached('pack-progress', async () => {
    const { data, error } = await supabase.from('pack_progress').select('*');
    if (error) throw error;
    return data;
  });
}

/** Gold "Mastery" bar: words that reached the top SRS box (mastery >= 5). */
export function masteryRatio(row) {
  if (!row || !row.word_count) return 0;
  return (row.mastered ?? 0) / row.word_count;
}

/** Per-pack coverage (pack_coverage view) for the blue "Progress" bar. */
export function fetchPackCoverage() {
  return cached('pack-coverage', async () => {
    const { data, error } = await supabase.from('pack_coverage').select('*');
    if (error) throw error;
    return data;
  });
}

/**
 * Blue "Progress" bar, distinct from SRS mastery: seeing every flashcard fills
 * 25%, and answering each word correctly in each of the three graded exercises
 * fills the other 75% (max practiced = 3 * word_count).
 */
export function coverageRatio(row) {
  const n = row?.word_count ?? 0;
  if (!n) return 0;
  const reviewed = Math.min(1, (row.reviewed ?? 0) / n);
  const practiced = Math.min(1, (row.practiced ?? 0) / (3 * n));
  return 0.25 * reviewed + 0.75 * practiced;
}

/** The words of one pack, in book order. */
export function fetchPackWords(packId) {
  return cached(`pack-words:${packId}`, async () => {
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .eq('pack_id', packId)
      .order('id');
    if (error) throw error;
    return data;
  });
}

/** Per-exercise-type accuracy for the current user. */
export function fetchExerciseAccuracy() {
  return cached('exercise-accuracy', async () => {
    const { data, error } = await supabase.from('exercise_accuracy').select('*');
    if (error) throw error;
    return data;
  });
}

/** The user's most-missed words, ranked by the weak_words view. */
export function fetchWeakWords(limit = 10) {
  return cached(`weak-words:${limit}`, async () => {
    const { data, error } = await supabase.from('weak_words').select('*').limit(limit);
    if (error) throw error;
    return data;
  });
}

/**
 * Per-pack revision state (seen / due counts, staleness) from the
 * pack_revision view. Only packs the user has actually started appear.
 */
export function fetchPackRevision() {
  return cached('pack-revision', async () => {
    const { data, error } = await supabase.from('pack_revision').select('*');
    if (error) throw error;
    return data;
  });
}

/**
 * Already-seen words for a revision session, most-stale first (never-due words
 * sort first so a session always fills). Scoped to a pack or a whole book.
 *
 * Reads word_progress with the words row embedded over the word_id FK, so RLS
 * scopes it to the caller for free — no RPC needed. Returns plain word rows so
 * the result drops straight into makeFillBlankItems().
 */
export function fetchRevisionWords({ packId = null, book = null, limit = 20 } = {}) {
  const key = `revision-words:${packId ?? 'all'}:${book ?? 'all'}:${limit}`;
  return cached(key, async () => {
    let q = supabase
      .from('word_progress')
      .select('next_due, last_reviewed, mastery, words!inner(*)')
      .order('next_due', { ascending: true, nullsFirst: true })
      .limit(limit);
    if (packId !== null) q = q.eq('words.pack_id', packId);
    if (book !== null) q = q.eq('words.book', book);

    const { data, error } = await q;
    if (error) throw error;
    return data.map((row) => ({ ...row.words, mastery: row.mastery, next_due: row.next_due }));
  });
}

/**
 * Attempt events from the last 90 days (timestamp + type + correctness), for XP,
 * streak and the weekly chart. Was fetchAttemptDates(): a streak is now gated on
 * daily XP, not "practised at all", so the raw dates are no longer enough.
 */
export function fetchAttemptEvents() {
  return cached('attempt-events', async () => {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('attempts')
      .select('created_at, exercise_type, is_correct')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000);
    if (error) throw error;
    return data.map((row) => ({ at: row.created_at, type: row.exercise_type, correct: row.is_correct }));
  });
}

/**
 * Server-authoritative streak state: refills/consumes streak freezes at the day
 * boundary and returns the current goal-gated streak. Called on app open and
 * after practice. Short TTL so a stale value self-heals. `freezeDays` (local day
 * keys) feed the client's longest-streak calc so a frozen day keeps a run whole.
 */
export function fetchStreakState() {
  return cached('streak-state', async () => {
    const { data, error } = await supabase.rpc('refresh_streak_state', { p_tz: DEVICE_TZ });
    if (error) throw error;
    const row = data?.[0] ?? {};
    const { data: fd } = await supabase.from('streak_freeze_days').select('day');
    return {
      streak: row.out_streak ?? 0,
      freezes: row.out_freezes ?? 0,
      freezeDays: new Set((fd ?? []).map((r) => r.day)),
    };
  }, 60_000);
}

/**
 * Local days that count toward a streak: XP met the goal, or the day was frozen.
 * Returns a Set of day keys.
 */
export function qualifyingDays(xpByDay, goal, frozen = new Set()) {
  const days = new Set(frozen);
  for (const [k, xp] of xpByDay) {
    if (xp >= goal) days.add(k);
  }
  return days;
}

/** Consecutive qualifying days ending today or yesterday (device timezone). */
export function computeStreak(qualDays, now = new Date()) {
  const cursor = new Date(now);
  // A streak survives until midnight: if today isn't done yet, start at yesterday.
  if (!qualDays.has(localDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (qualDays.has(localDayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Longest run of consecutive qualifying days anywhere in the history window. */
export function computeLongestStreak(qualDays) {
  const days = [...qualDays].map((k) => new Date(`${k}T00:00:00`).getTime()).sort((a, b) => a - b);
  if (days.length === 0) return 0;
  const DAY = 24 * 60 * 60 * 1000;
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const gap = Math.round((days[i] - days[i - 1]) / DAY);
    run = gap === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/** XP earned per day for the last `n` days (oldest → today), for the weekly chart. */
export function dailyActivity(xpByDay, n = 7, now = new Date()) {
  const buckets = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    buckets.push({ date: d, key: localDayKey(d), xp: xpByDay.get(localDayKey(d)) ?? 0 });
  }
  return buckets;
}

/**
 * XP per day for the current calendar week, Sunday → Saturday (device zone), for
 * the weekly line chart. `future` marks days after today, which the chart leaves
 * unplotted. `todayKey` marks today.
 */
export function weekActivity(xpByDay, now = new Date()) {
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay()); // back to Sunday
  const todayKey = localDayKey(now);
  const buckets = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = localDayKey(d);
    buckets.push({
      date: d,
      key,
      xp: xpByDay.get(key) ?? 0,
      today: key === todayKey,
      future: d > now && key !== todayKey,
    });
  }
  return buckets;
}

// ---------- writes ----------

/**
 * Records one answer through the record_attempt RPC (atomic: attempt log +
 * word_progress upsert + mastery/SRS bump), then invalidates progress caches so
 * bars/rings update after a session. Fire-and-forget with one retry.
 */
export async function recordAttempt({ wordId, packId, type, correct }) {
  const call = () =>
    supabase.rpc('record_attempt', {
      p_word_id: wordId,
      p_pack_id: packId,
      p_type: type,
      p_correct: correct,
    });
  let { error } = await call();
  if (error) ({ error } = await call()); // single retry
  if (error) {
    console.warn('[recordAttempt] failed', error.message);
    return;
  }
  invalidate(
    'pack-progress', 'pack-coverage', 'exercise-accuracy', 'weak-words', 'attempt-events',
    // An answer moves next_due, so revision state is stale too.
    'pack-revision', 'revision-words',
    // Earning XP today can complete the goal (bumping the streak / clearing a
    // freeze) and complete a mutual day, so those are stale too.
    'streak-state', 'friends:mutual',
  );
}
