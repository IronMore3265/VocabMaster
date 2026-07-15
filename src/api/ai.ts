import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { GeneratedExercise, McqItem } from '@/types/exercise';

export interface SuggestResponse {
  suggestionId?: string;
  payload?: GeneratedExercise;
  cached?: boolean;
  error?: string;
  message?: string;
}

/** Asks the suggest-exercise edge function for a personalized session. */
export function useSuggestExercise() {
  return useMutation({
    mutationFn: async ({ force = false }: { force?: boolean } = {}): Promise<SuggestResponse> => {
      const { data, error } = await supabase.functions.invoke('suggest-exercise', {
        body: { force },
      });
      if (error) throw error;
      return data as SuggestResponse;
    },
  });
}

/** Marks an AI session finished with its score (0..1). */
export function useCompleteSuggestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ suggestionId, score }: { suggestionId: string; score: number }) => {
      const { error } = await supabase
        .from('ai_suggestions')
        .update({ status: 'completed', score, completed_at: new Date().toISOString() })
        .eq('id', suggestionId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercise-accuracy'] }),
  });
}

/** The AI payload may include future item kinds; the player renders MCQs. */
export function mcqItems(payload: GeneratedExercise): McqItem[] {
  return payload.items.filter((item): item is McqItem => item.kind !== 'matching');
}
