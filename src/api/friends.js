// Friends: your shareable code, connections, and a friend's headline stats.
// Every cross-user read goes through a security-definer RPC (see
// supabase/migrations/0007_friends.sql) — the analytics views can't help here
// because they hardcode auth.uid().
import { supabase } from '../supabase.js';
import {
  DEVICE_TZ, cached, computeStreak, fetchAttemptDates, fetchExerciseAccuracy, fetchPackProgress,
  invalidate,
} from './queries.js';

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
  });
}

/**
 * The mutual streak — consecutive days both you and the friend practised — for
 * every accepted friend at once. One RPC rather than one per row: the Friends
 * tab renders a list. Friends with no shared days come back as 0, so callers can
 * index the Map without a missing-key case.
 */
export function fetchMutualStreaks() {
  return cached('friends:mutual', async () => {
    const { data, error } = await supabase.rpc('mutual_streaks', { p_tz: DEVICE_TZ });
    if (error) throw error;
    return new Map((data ?? []).map((r) => [
      r.out_friend_id,
      { streak: Number(r.out_streak ?? 0), lastMutualDay: r.out_last_mutual_day },
    ]));
  });
}

/** Headline stats for one accepted friend. The RPC re-checks the friendship. */
export function fetchFriendStats(friendId) {
  return cached(`friends:stats:${friendId}`, async () => {
    const { data, error } = await supabase.rpc('friend_stats', {
      p_friend_id: friendId,
      // Same zone computeStreak() uses, so the compare sheet isn't putting a
      // device-local streak next to a UTC one.
      p_tz: DEVICE_TZ,
    });
    if (error) throw error;
    const row = data?.[0];
    if (!row) throw new Error('No stats available');
    return {
      id: row.out_friend_id,
      name: row.out_display_name,
      attempts: Number(row.out_attempts ?? 0),
      accuracy: Number(row.out_accuracy ?? 0),
      mastered: Number(row.out_mastered ?? 0),
      streak: Number(row.out_streak ?? 0),
      lastActive: row.out_last_active,
    };
  });
}

/**
 * The signed-in user's own stats in the same shape as fetchFriendStats, so the
 * compare view can put the two side by side. Built from the existing analytics
 * reads rather than a second RPC — they're already cached for the Analytics tab.
 */
export async function fetchMyStats() {
  const [accuracy, dates, progress] = await Promise.all([
    fetchExerciseAccuracy().catch(() => []),
    fetchAttemptDates().catch(() => []),
    fetchPackProgress().catch(() => []),
  ]);
  const attempts = accuracy.reduce((s, r) => s + (r.attempts ?? 0), 0);
  return {
    name: 'You',
    attempts,
    accuracy: attempts > 0
      ? accuracy.reduce((s, r) => s + (r.accuracy ?? 0) * (r.attempts ?? 0), 0) / attempts
      : 0,
    mastered: progress.reduce((s, r) => s + (r.mastered ?? 0), 0),
    streak: computeStreak(dates),
    lastActive: dates[0] ?? null,
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

// The RPCs raise with messages meant for humans; surface those and keep the
// Postgres noise out of the UI.
function friendlyError(error) {
  const msg = String(error?.message || '');
  const m = msg.match(/^.*?:\s*(.+)$/);
  return (m ? m[1] : msg) || 'Something went wrong.';
}
