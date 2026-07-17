import { supabase } from '../supabase.js';

// ---------- tiny promise cache ----------
// Replaces react-query: memoises in-flight/resolved promises by key so screens
// can call freely, and clears keys after a write so progress re-reads fresh.
const cache = new Map();

export function cached(key, fn) {
  if (!cache.has(key)) {
    cache.set(
      key,
      fn().catch((err) => {
        cache.delete(key); // let a failed fetch be retried
        throw err;
      }),
    );
  }
  return cache.get(key);
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

export function progressRatio(row) {
  if (!row || !row.word_count) return 0;
  return (row.mastered ?? 0) / row.word_count;
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

/** Attempt timestamps from the last 90 days, for the streak calculation. */
export function fetchAttemptDates() {
  return cached('attempt-dates', async () => {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('attempts')
      .select('created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000);
    if (error) throw error;
    return data.map((row) => row.created_at);
  });
}

/** Consecutive practice days ending today or yesterday (device timezone). */
export function computeStreak(timestamps, now = new Date()) {
  const days = new Set(timestamps.map((ts) => new Date(ts).toDateString()));
  const cursor = new Date(now);
  // A streak survives until midnight: if today has no practice yet, start yesterday.
  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Longest run of consecutive practice days anywhere in the history window. */
export function computeLongestStreak(timestamps) {
  const days = [...new Set(timestamps.map((ts) => new Date(ts).toDateString()))]
    .map((s) => new Date(s).getTime())
    .sort((a, b) => a - b);
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

/** Practice-attempt counts for the last `n` days (oldest → today), for charts. */
export function dailyActivity(timestamps, n = 7, now = new Date()) {
  const buckets = [];
  const index = new Map();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const bucket = { date: d, key: d.toDateString(), count: 0 };
    index.set(bucket.key, buckets.length);
    buckets.push(bucket);
  }
  for (const ts of timestamps) {
    const k = new Date(ts).toDateString();
    if (index.has(k)) buckets[index.get(k)].count++;
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
    'pack-progress', 'exercise-accuracy', 'weak-words', 'attempt-dates',
    // An answer moves next_due, so revision state is stale too.
    'pack-revision', 'revision-words',
  );
}
