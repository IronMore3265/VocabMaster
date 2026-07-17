import { supabase } from '../supabase.js';

/** Raw call to the dictionary-lookup edge function (MW + free-dictionary fallback). */
export async function lookupWord(word) {
  const { data, error } = await supabase.functions.invoke('dictionary-lookup', {
    body: { word },
  });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  return data;
}

export async function fetchBookmarks() {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('word, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function toggleBookmark({ word, payload, bookmarked }) {
  if (bookmarked) {
    const { error } = await supabase.from('bookmarks').delete().eq('word', word);
    if (error) throw error;
  } else {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) throw new Error('Not signed in');
    const { error } = await supabase.from('bookmarks').upsert({
      user_id: userRes.user.id,
      word,
      payload,
    });
    if (error) throw error;
  }
}
