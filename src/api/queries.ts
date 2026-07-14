import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { ExerciseType, PackProgressRow, PackRow, WordRow } from '@/types/models';

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
    },
  });
}
