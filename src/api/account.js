import { supabase } from '../supabase.js';

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
