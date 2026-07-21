// Friends: your shareable code, connections, and a friend's headline stats.
// Every cross-user read goes through a security-definer RPC (see
// supabase/migrations/0007_friends.sql) — the analytics views can't help here
// because they hardcode auth.uid().
import { supabase } from '../supabase.js';
import { getSettings } from '../store.js';
import {
  DEVICE_TZ, cached, computeStreak, dailyXp, fetchExerciseAccuracy, fetchAttemptEvents,
  fetchPackProgress, fetchStreakState, invalidate, levelForXp, localDayKey, qualifyingDays,
  totalXp,
} from './queries.js';

// Friend-sourced reads can change on another device without our knowing to
// invalidate, so they carry a short TTL that lets a stale value self-heal.
const FRIEND_TTL = 45_000;

/**
 * The signed-in user's own profile row. The code, the name and the avatar all
 * live here, so one read serves all three — there is no JWT copy of the avatar
 * to keep in sync (see updateAvatar in api/account.js).
 */
export function fetchMyProfile() {
  return cached('friends:profile', async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) throw new Error('Not signed in');
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar, friend_code')
      .eq('id', userRes.user.id)
      .single();
    if (error) throw error;
    return data;
  });
}

/** The signed-in user's own 6-digit code. */
export async function fetchMyCode() {
  return (await fetchMyProfile()).friend_code;
}

/**
 * The user's connections, split by state. `direction` distinguishes a request
 * you sent from one you received, so the UI can offer Accept only on the latter.
 */
export function fetchFriends() {
  return cached('friends:list', async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) throw new Error('Not signed in');

    const { data, error } = await supabase
      .from('friendships')
      .select('friend_id, status, direction, created_at')
      .eq('user_id', userRes.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (data.length === 0) return { accepted: [], incoming: [], outgoing: [] };

    // Names live on profiles; the widened RLS policy lets us read a connection's
    // row. Fetched separately because PostgREST can't embed across the two-hop
    // friendships -> profiles relation without a declared FK to profiles.
    const ids = data.map((r) => r.friend_id);
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, display_name, avatar')
      .in('id', ids);
    if (pErr) throw pErr;
    const byId = new Map(profiles.map((p) => [p.id, p]));

    const rows = data.map((r) => ({
      id: r.friend_id,
      name: byId.get(r.friend_id)?.display_name || 'VocabMaster user',
      avatar: byId.get(r.friend_id)?.avatar ?? null,
      status: r.status,
      direction: r.direction,
    }));
    return {
      accepted: rows.filter((r) => r.status === 'accepted'),
      incoming: rows.filter((r) => r.status === 'pending' && r.direction === 'in'),
      outgoing: rows.filter((r) => r.status === 'pending' && r.direction === 'out'),
    };
  }, FRIEND_TTL);
}

/**
 * The mutual streak — consecutive days both you and the friend practised — for
 * every accepted friend at once. One RPC rather than one per row: the Friends
 * tab renders a list. Friends with no shared days come back as 0, so callers can
 * index the Map without a missing-key case. `friendToday` is whether the friend
 * has already hit their own goal today (the caller's side is client-side
 * knowledge: fetchMyStats().todayXp >= goal), which drives the fire's lit state.
 */
export function fetchMutualStreaks() {
  return cached('friends:mutual', async () => {
    const { data, error } = await supabase.rpc('mutual_streaks', { p_tz: DEVICE_TZ });
    if (error) throw error;
    return new Map((data ?? []).map((r) => [
      r.out_friend_id,
      {
        streak: Number(r.out_streak ?? 0),
        lastMutualDay: r.out_last_mutual_day,
        friendToday: !!r.out_friend_today,
      },
    ]));
  }, FRIEND_TTL);
}

/**
 * Each accepted friend's current streak-freeze count, so the UI can offer a gift
 * only to friends below the hold cap of 2 (Duolingo-style). Friends missing from
 * the map are treated as full by callers.
 */
export function fetchFriendFreezes() {
  return cached('friends:freezes', async () => {
    const { data, error } = await supabase.rpc('friend_freezes');
    if (error) throw error;
    return new Map((data ?? []).map((r) => [r.out_friend_id, Number(r.out_freezes ?? 0)]));
  }, FRIEND_TTL);
}

/** Headline stats for one accepted friend. The RPC re-checks the friendship. */
export function fetchFriendStats(friendId) {
  return cached(`friends:stats:${friendId}`, async () => {
    const { data, error } = await supabase.rpc('friend_stats', {
      p_friend_id: friendId,
      // Same zone computeStreak() uses, so the compare view isn't putting a
      // device-local streak next to a UTC one.
      p_tz: DEVICE_TZ,
    });
    if (error) throw error;
    const row = data?.[0];
    if (!row) throw new Error('No stats available');
    const xp = Number(row.out_total_xp ?? 0);
    return {
      id: row.out_friend_id,
      name: row.out_display_name,
      packs: Number(row.out_packs ?? 0),
      accuracy: Number(row.out_accuracy ?? 0),
      mastered: Number(row.out_mastered ?? 0),
      streak: Number(row.out_streak ?? 0),
      totalXp: xp,
      level: levelForXp(xp).level,
      lastActive: row.out_last_active,
    };
  }, FRIEND_TTL);
}

/** A friend's daily XP for the last `days` days, zero-filled, for the compare chart. */
export function fetchFriendXpSeries(friendId, days = 30) {
  return cached(`friends:xp:${friendId}:${days}`, async () => {
    const { data, error } = await supabase.rpc('friend_xp_series', {
      p_friend_id: friendId,
      p_days: days,
      p_tz: DEVICE_TZ,
    });
    if (error) throw error;
    return (data ?? []).map((r) => ({ day: r.out_day, xp: Number(r.out_xp ?? 0) }));
  }, FRIEND_TTL);
}

/** The signed-in user's own daily XP series (client-derived), same shape as above. */
export async function fetchMyXpSeries(days = 30) {
  const events = await fetchAttemptEvents().catch(() => []);
  const byDay = dailyXp(events);
  const out = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = localDayKey(d);
    out.push({ day: key, xp: byDay.get(key) ?? 0 });
  }
  return out;
}

/** Number of packs where every word is mastered (box 5). */
export function packsCompleted(progress) {
  return progress.filter((r) => (r.word_count ?? 0) > 0 && (r.mastered ?? 0) >= r.word_count).length;
}

/**
 * The signed-in user's own stats in the same shape as fetchFriendStats, so the
 * compare view can put the two side by side. Built from the existing analytics
 * reads (already cached for the Analytics tab) plus the authoritative streak.
 */
export async function fetchMyStats() {
  const goal = getSettings().dailyGoal;
  const [accuracy, events, progress, streakState] = await Promise.all([
    fetchExerciseAccuracy().catch(() => []),
    fetchAttemptEvents().catch(() => []),
    fetchPackProgress().catch(() => []),
    fetchStreakState().catch(() => null),
  ]);
  const attempts = accuracy.reduce((s, r) => s + (r.attempts ?? 0), 0);
  const xp = totalXp(events);
  const byDay = dailyXp(events);
  const todayXp = byDay.get(localDayKey(new Date())) ?? 0;
  const streak = streakState?.streak
    ?? computeStreak(qualifyingDays(byDay, goal, streakState?.freezeDays));
  return {
    name: 'You',
    packs: packsCompleted(progress),
    accuracy: attempts > 0
      ? accuracy.reduce((s, r) => s + (r.accuracy ?? 0) * (r.attempts ?? 0), 0) / attempts
      : 0,
    mastered: progress.reduce((s, r) => s + (r.mastered ?? 0), 0),
    streak,
    freezes: streakState?.freezes ?? 0,
    totalXp: xp,
    level: levelForXp(xp).level,
    todayXp,
    goal,
    lastActive: events[0]?.at ?? null,
  };
}

export async function addFriendByCode(code) {
  const { data, error } = await supabase.rpc('add_friend_by_code', { p_code: code });
  if (error) throw new Error(friendlyError(error));
  invalidate('friends:list');
  return data?.[0] ?? null;
}

export async function acceptFriend(friendId) {
  const { error } = await supabase.rpc('accept_friend', { p_friend_id: friendId });
  if (error) throw new Error(friendlyError(error));
  invalidate('friends:');
}

export async function removeFriend(friendId) {
  const { error } = await supabase.rpc('remove_friend', { p_friend_id: friendId });
  if (error) throw new Error(friendlyError(error));
  invalidate('friends:');
}

/**
 * Freeze gifts addressed to the user after `sinceIso`, oldest first. Uncached:
 * it backs the one-shot boot/resume "did a gift arrive while we were closed"
 * check (see checkMissedFreezeGifts in lib/streakCelebration.js).
 */
export async function fetchFreezeGiftsSince(sinceIso) {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('freeze_gifts')
    .select('sender_id, created_at')
    .eq('recipient_id', userRes.user.id)
    .gt('created_at', sinceIso)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * Give one streak freeze to an accepted friend. The RPC enforces the friendship, the
 * once-per-two-weeks-per-friend cooldown, and the recipient's hold cap, raising a
 * human-readable message for each — surfaced via friendlyError.
 */
export async function giftStreakFreeze(friendId) {
  const { error } = await supabase.rpc('gift_streak_freeze', { p_friend_id: friendId });
  if (error) throw new Error(friendlyError(error));
  invalidate('friends:freezes');
}

/**
 * Nudge an accepted friend to finish today's goal. The RPC re-checks the friendship
 * and enforces a once-per-day-per-friend cooldown (its message surfaces via
 * friendlyError). Delivery is in-app: the friend's Realtime subscription raises a
 * local heads-up while their app is open, else they see it next time they open it.
 */
export async function nudgeFriend(friendId) {
  const { error } = await supabase.rpc('nudge_friend', {
    p_friend_id: friendId,
    p_tz: DEVICE_TZ,
  });
  if (error) throw new Error(friendlyError(error));
}

// The RPCs raise with messages meant for humans; surface those and keep the
// Postgres noise out of the UI.
function friendlyError(error) {
  const msg = String(error?.message || '');
  const m = msg.match(/^.*?:\s*(.+)$/);
  return (m ? m[1] : msg) || 'Something went wrong.';
}
