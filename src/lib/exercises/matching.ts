import type { MatchingItem } from '@/types/exercise';
import type { WordRow } from '@/types/models';

import { shortDefinition } from './distractors';
import { mulberry32, shuffle } from './rng';

/**
 * Splits a pack's words into rounds of `roundSize` word↔definition pairs.
 * Rounds with fewer than 2 pairs are dropped (nothing to match).
 */
export function makeMatchingRounds(
  words: readonly WordRow[],
  seed: number,
  roundSize = 5,
): MatchingItem[] {
  const rng = mulberry32(seed);
  const usable = shuffle(
    words.filter((word) => word.definition),
    rng,
  );

  const rounds: MatchingItem[] = [];
  for (let i = 0; i < usable.length; i += roundSize) {
    const chunk = usable.slice(i, i + roundSize);
    if (chunk.length < 2) break;
    rounds.push({
      kind: 'matching',
      pairs: chunk.map((word) => ({
        wordId: word.id,
        word: word.word,
        match: shortDefinition(word.definition!),
      })),
    });
  }
  return rounds;
}
