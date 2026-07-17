import { supabase } from '../supabase.js';
import { AVATAR_IDS } from '../avatars.js';
import { invalidate } from './queries.js';

/**
 * Permanently deletes the signed-in user's account and all of their data.
 * The delete-account edge function removes the auth user with the service role;
 * every per-user table cascades from auth.users, so nothing is left behind.
 */
export async function deleteAccount() {
  const { data, error } = await supabase.functions.invoke('delete-account', { body: {} });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  return data;
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
