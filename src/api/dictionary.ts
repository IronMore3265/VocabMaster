import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database';

export interface DictionaryEntry {
  headword: string;
  pos: string | null;
  pronunciation: string | null;
  ipa: string | null;
  audioUrl: string | null;
  definitions: string[];
}

export interface DictionaryPayload {
  word: string;
  entries?: DictionaryEntry[];
  suggestions?: string[];
  synonyms?: string[];
  antonyms?: string[];
}

/** Raw call to the dictionary-lookup edge function (MW + free-dictionary fallback). */
export async function lookupWord(word: string): Promise<DictionaryPayload> {
  const { data, error } = await supabase.functions.invoke('dictionary-lookup', {
    body: { word },
  });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  return data as DictionaryPayload;
}

export function useDictionaryLookup() {
  return useMutation({ mutationFn: lookupWord });
}

const RECENT_KEY = 'dictionary.recent';
const RECENT_MAX = 8;

export async function loadRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function pushRecentSearch(word: string): Promise<string[]> {
  const current = await loadRecentSearches();
  const next = [word, ...current.filter((w) => w !== word)].slice(0, RECENT_MAX);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}

export async function clearRecentSearches(): Promise<void> {
  await AsyncStorage.removeItem(RECENT_KEY);
}

export function useBookmarks() {
  return useQuery({
    queryKey: ['bookmarks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('word, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useToggleBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      word,
      payload,
      bookmarked,
    }: {
      word: string;
      payload: DictionaryPayload | null;
      bookmarked: boolean;
    }) => {
      if (bookmarked) {
        const { error } = await supabase.from('bookmarks').delete().eq('word', word);
        if (error) throw error;
      } else {
        const { data: userRes } = await supabase.auth.getUser();
        if (!userRes.user) throw new Error('Not signed in');
        const { error } = await supabase.from('bookmarks').upsert({
          user_id: userRes.user.id,
          word,
          payload: payload as unknown as Json,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookmarks'] }),
  });
}
