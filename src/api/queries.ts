import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type {
  ExerciseType,
  PackProgressRow,
  PackRow,
  WeakWordRow,
  WordRow,
} from '@/types/models';
import type { Tables } from '@/types/database';

/** Static pack metadata (85 packs; never changes). */
export function usePacks() {
  return useQuery({
    queryKey: ['packs'],
    staleTime: Infinity,
    queryFn: async (): Promise<PackRow[]> => {
      const { data, error } = await supabase
        .from('packs')
        .select('*')
        .order('book')
        .order('pack_number');
      if (error) throw error;
      return data;
    },
  });
}

/** Per-pack mastered/seen counts for the current user (pack_progress view). */
export function usePackProgress() {
  return useQuery({
    queryKey: ['pack-progress'],
    queryFn: async (): Promise<PackProgressRow[]> => {
      const { data, error } = await supabase.from('pack_progress').select('*');
      if (error) throw error;
      return data;
    },
  });
}

export function progressRatio(row: PackProgressRow | undefined): number {
  if (!row || !row.word_count) return 0;
  return (row.mastered ?? 0) / row.word_count;
}

/** The words of one pack, in book order. */
export function usePackWords(packId: number) {
  return useQuery({
    queryKey: ['pack-words', packId],
    staleTime: Infinity,
    enabled: Number.isFinite(packId),
    queryFn: async (): Promise<WordRow[]> => {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('pack_id', packId)
        .order('id');
      if (error) throw error;
      return data;
    },
  });
}

/** Per-exercise-type accuracy for the current user. */
export function useExerciseAccuracy() {
  return useQuery({
    queryKey: ['exercise-accuracy'],
    queryFn: async (): Promise<Tables<'exercise_accuracy'>[]> => {
      const { data, error } = await supabase.from('exercise_accuracy').select('*');
      if (error) throw error;
      return data;
    },
  });
}

/** The user's most-missed words, ranked by the weak_words view. */
export function useWeakWords(limit = 10) {
  return useQuery({
    queryKey: ['weak-words', limit],
    queryFn: async (): Promise<WeakWordRow[]> => {
      const { data, error } = await supabase.from('weak_words').select('*').limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

/** Attempt timestamps from the last 90 days, for the streak calculation. */
export function useAttemptDates() {
  return useQuery({
    queryKey: ['attempt-dates'],
    queryFn: async (): Promise<string[]> => {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('attempts')
        .select('created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data.map((row) => row.created_at);
    },
  });
}

/** Consecutive practice days ending today or yesterday (device timezone). */
export function computeStreak(timestamps: readonly string[], now = new Date()): number {
  const days = new Set(timestamps.map((ts) => new Date(ts).toDateString()));
  const cursor = new Date(now);
  // A streak survives until midnight: if today has no practice yet, start from yesterday.
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

export interface AttemptInput {
  wordId: number;
  packId: number;
  type: ExerciseType;
  correct: boolean;
}

/**
 * Records one answer through the record_attempt RPC (atomic: attempt log +
 * word_progress upsert + mastery/SRS bump). Fire-and-forget with retry;
 * progress queries are invalidated so bars/rings update after a session.
 */
export function useRecordAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    retry: 2,
    mutationFn: async ({ wordId, packId, type, correct }: AttemptInput) => {
      const { error } = await supabase.rpc('record_attempt', {
        p_word_id: wordId,
        p_pack_id: packId,
        p_type: type,
        p_correct: correct,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pack-progress'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-accuracy'] });
      queryClient.invalidateQueries({ queryKey: ['weak-words'] });
      queryClient.invalidateQueries({ queryKey: ['attempt-dates'] });
    },
  });
}
