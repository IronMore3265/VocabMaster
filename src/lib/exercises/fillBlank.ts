import type { McqItem } from '@/types/exercise';
import type { WordRow } from '@/types/models';

import { pickDistractors, stem } from './distractors';
import { mulberry32, pickOne, shuffle } from './rng';

const BLANK = '_____';

/**
 * Builds one fill-in-the-blank MCQ per word: an example sentence with the
 * headword (or an inflection, via stem matching) blanked out, and four word
 * options. Words whose sentences never contain the headword fall back to a
 * definition MCQ ("Which word means: …?").
 */
export function makeFillBlankItems(words: readonly WordRow[], seed: number): McqItem[] {
  const rng = mulberry32(seed);

  const items = words
    .filter((word) => word.definition)
    .map((word): McqItem | null => {
      const distractors = pickDistractors(word, words, 3, rng);
      if (distractors.length < 3) return null;

      const options = shuffle(
        [word, ...distractors].map((w) => ({ id: String(w.id), text: w.word })),
        rng,
      );

      const blanked = blankSentence(word, rng);
      if (blanked) {
        return {
          kind: 'fill_blank',
          wordId: word.id,
          word: word.word,
          prompt: blanked,
          options,
          correctOptionId: String(word.id),
          explanation: word.definition ?? undefined,
        };
      }
      return {
        kind: 'mcq_definition',
        wordId: word.id,
        word: word.word,
        prompt: `Which word means: “${word.definition}”?`,
        options,
        correctOptionId: String(word.id),
      };
    })
    .filter((item): item is McqItem => item !== null);

  return shuffle(items, rng);
}

/** Blanks the headword out of a random matching example sentence, or null. */
export function blankSentence(word: WordRow, rng: () => number): string | null {
  const sentences = word.example_sentences ?? [];
  const pattern = new RegExp(`\\b${escapeRegExp(stem(word.word))}\\w*\\b`, 'i');
  const candidates = sentences.filter((sentence) => pattern.test(sentence));
  if (candidates.length === 0) return null;
  return pickOne(candidates, rng).replace(pattern, BLANK);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
