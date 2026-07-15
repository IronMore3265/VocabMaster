import { shortDefinition } from './distractors.js';
import { mulberry32, shuffle } from './rng.js';

/**
 * Splits a pack's words into rounds of `roundSize` word↔definition pairs.
 * Rounds with fewer than 2 pairs are dropped (nothing to match).
 */
export function makeMatchingRounds(words, seed, roundSize = 5) {
  const rng = mulberry32(seed);
  const usable = shuffle(
    words.filter((word) => word.definition),
    rng,
  );

  const rounds = [];
  for (let i = 0; i < usable.length; i += roundSize) {
    const chunk = usable.slice(i, i + roundSize);
    if (chunk.length < 2) break;
    rounds.push({
      kind: 'matching',
      pairs: chunk.map((word) => ({
        wordId: word.id,
        word: word.word,
        match: shortDefinition(word.definition),
      })),
    });
  }
  return rounds;
}
