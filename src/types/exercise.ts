/**
 * Shared exercise item contract. Locally generated exercises (src/lib/exercises)
 * and Gemini-generated ones (suggest-exercise edge function) both produce this
 * shape, so a single player renders both.
 */

export interface Option {
  id: string;
  text: string;
}

export interface McqItem {
  kind: 'mcq_definition' | 'fill_blank' | 'syn_ant';
  wordId: number;
  /** The word being tested (for TTS and the results review). */
  word: string;
  prompt: string;
  options: Option[];
  correctOptionId: string;
  /** syn_ant only. */
  mode?: 'synonym' | 'antonym';
  explanation?: string;
  /** AI mixed sessions span packs; the word's own pack for record_attempt. */
  packId?: number;
}

export interface MatchingPair {
  wordId: number;
  word: string;
  match: string;
}

export interface MatchingItem {
  kind: 'matching';
  pairs: MatchingPair[];
}

export type ExerciseItem = McqItem | MatchingItem;

export interface GeneratedExercise {
  focusSummary: string;
  items: ExerciseItem[];
}
