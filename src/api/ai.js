import { supabase } from '../supabase.js';
import { invalidate } from './queries.js';

/** Asks the suggest-exercise edge function for a personalized session. */
export async function suggestExercise({ force = false } = {}) {
  const { data, error } = await supabase.functions.invoke('suggest-exercise', {
    body: { force },
  });
  if (error) throw error;
  return data;
}

/** Marks an AI session finished with its score (0..1). */
export async function completeSuggestion({ suggestionId, score }) {
  const { error } = await supabase
    .from('ai_suggestions')
    .update({ status: 'completed', score, completed_at: new Date().toISOString() })
    .eq('id', suggestionId);
  if (error) throw error;
  invalidate('exercise-accuracy');
}

/** The AI payload may include future item kinds; the player renders MCQs. */
export function mcqItems(payload) {
  return payload.items.filter((item) => item.kind !== 'matching');
}
