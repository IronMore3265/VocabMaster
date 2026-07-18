import { supabase } from '../supabase.js';
import { AVATAR_IDS } from '../avatars.js';
import { getSettings, setSettings } from '../store.js';
import { invalidate } from './queries.js';

/** The daily XP goals a user can pick, matching profiles.daily_goal's check. */
export const DAILY_GOALS = [
  { value: 50, label: 'Casual' },
  { value: 100, label: 'Regular' },
  { value: 250, label: 'Serious' },
];

/**
 * Sets the daily XP goal that gates the streak. The profile row is the source of
 * truth (friend streak calcs read it server-side); the device setting mirrors it
 * so the client's own streak math is instant and works offline.
 */
export async function updateDailyGoal(goal) {
  const value = Number(goal);
  if (!DAILY_GOALS.some((g) => g.value === value)) throw new Error('Pick a goal from the list.');

  const { data: userRes, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userRes.user?.id;
  if (!userId) throw new Error('Not signed in.');

  const { error } = await supabase.from('profiles').update({ daily_goal: value }).eq('id', userId);
  if (error) throw error;

  setSettings({ dailyGoal: value });
  // A new goal re-decides which days qualified, so the streak and friend views move.
  invalidate('streak-state', 'friends', 'attempt-events');
  return value;
}

/** Reads the daily goal from the profile and mirrors it into device settings. */
export async function syncDailyGoal() {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) return getSettings().dailyGoal;
  const { data } = await supabase.from('profiles').select('daily_goal').eq('id', userId).single();
  const goal = data?.daily_goal;
  if (goal && goal !== getSettings().dailyGoal) setSettings({ dailyGoal: goal });
  return goal ?? getSettings().dailyGoal;
}

/**
 * Permanently deletes the signed-in user's account and all of their data.
 * Calls the delete_current_user() RPC (SECURITY DEFINER), which runs
 * `delete from auth.users where id = auth.uid()`; every per-user table cascades
 * from auth.users, so nothing is left behind. This replaced the delete-account
 * edge function, whose admin.deleteUser() path failed with an opaque 500.
 */
export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_current_user');
  if (error) throw error;
}

/**
 * Erases the signed-in user's learning history — attempts, per-word progress,
 * frozen days, AI sessions — via the reset_progress() RPC, and restores the
 * streak-freeze inventory. The account, profile, friendships, gifts and
 * bookmarks all survive; callers must also clear device-local progress state
 * (see clearLocalProgressState in store.js) and drop the query cache.
 */
export async function resetProgress() {
  const { error } = await supabase.rpc('reset_progress');
  if (error) throw error;
}

export const DISPLAY_NAME_MAX = 40;

/**
 * Renames the signed-in user. Writes both the JWT metadata (what Settings reads)
 * and the profiles row (what friends read) — they're separate stores and drift
 * apart if only one is updated.
 */
export async function updateDisplayName(name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) throw new Error('Name cannot be empty.');
  if (trimmed.length > DISPLAY_NAME_MAX) {
    throw new Error(`Name must be ${DISPLAY_NAME_MAX} characters or fewer.`);
  }

  const { data, error } = await supabase.auth.updateUser({ data: { display_name: trimmed } });
  if (error) throw error;

  const userId = data.user?.id;
  if (userId) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ display_name: trimmed })
      .eq('id', userId);
    if (profileError) throw profileError;
  }
  invalidate('friends');
  return trimmed;
}

/**
 * Sets the signed-in user's avatar to an id from the set in src/avatars.js.
 *
 * Writes only the profiles row — deliberately NOT the JWT metadata that
 * updateDisplayName() also writes. The name dual-writes because two stores
 * already hold it (sign-up seeds the metadata copy, Settings reads it), so that
 * helper is patching a split it inherited. Avatar has no such split: nothing
 * seeds one at signup and nothing reads one from the JWT, so a second copy would
 * create the drift it is meant to prevent. Own-avatar reads go through
 * fetchMyProfile(), which fetches this row anyway.
 */
export async function updateAvatar(id) {
  const avatar = String(id ?? '').trim();
  if (!AVATAR_IDS.includes(avatar)) throw new Error('Pick an avatar from the list.');

  const { data: userRes, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userRes.user?.id;
  if (!userId) throw new Error('Not signed in.');

  const { error } = await supabase.from('profiles').update({ avatar }).eq('id', userId);
  if (error) throw error;

  invalidate('friends');
  return avatar;
}
