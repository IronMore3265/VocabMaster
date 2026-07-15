import { pickDistractors, shortDefinition } from './distractors.js';
import { mulberry32, pickOne, shuffle } from './rng.js';

/**
 * Synonym/antonym MCQs from the enriched synonyms/antonyms columns.
 * Distractors are other words' synonyms (same POS preferred); in antonym mode
 * the target's own synonyms are the trap distractors. Words without enrichment
 * fall back to a "closest in meaning" definition MCQ.
 */
export function makeSynAntItems(words, seed) {
  const rng = mulberry32(seed);

  const items = words
    .filter((word) => word.definition)
    .map((word) => {
      const wantAntonym = word.antonyms.length > 0 && rng() < 0.4;
      if (wantAntonym) return antonymItem(word, words, rng);
      if (word.synonyms.length > 0) return synonymItem(word, words, rng);
      return closestMeaningItem(word, words, rng);
    })
    .filter((item) => item !== null);

  return shuffle(items, rng);
}

function synonymItem(word, pool, rng) {
  const correct = pickOne(word.synonyms, rng);
  const distractors = foreignSynonyms(word, pool, 3, rng, correct);
  if (distractors.length < 3) return closestMeaningItem(word, pool, rng);
  return buildItem(word, 'synonym', `Which is a synonym of “${word.word}”?`, correct, distractors, rng);
}

function antonymItem(word, pool, rng) {
  const correct = pickOne(word.antonyms, rng);
  // The word's own synonyms are the classic trap in antonym questions.
  const traps = shuffle(word.synonyms, rng).slice(0, 2);
  const fillers = foreignSynonyms(word, pool, 3 - traps.length, rng, correct);
  const distractors = [...traps, ...fillers].slice(0, 3);
  if (distractors.length < 3) return closestMeaningItem(word, pool, rng);
  return buildItem(word, 'antonym', `Which is an antonym of “${word.word}”?`, correct, distractors, rng);
}

/** Fallback used before enrichment: pick the definition that matches the word. */
function closestMeaningItem(word, pool, rng) {
  const distractors = pickDistractors(word, pool, 3, rng);
  if (distractors.length < 3) return null;

  const options = shuffle(
    [word, ...distractors].map((w) => ({
      id: String(w.id),
      text: shortDefinition(w.definition),
    })),
    rng,
  );

  return {
    kind: 'syn_ant',
    wordId: word.id,
    word: word.word,
    mode: 'synonym',
    prompt: `Which is closest in meaning to “${word.word}”?`,
    options,
    correctOptionId: String(word.id),
    explanation: word.definition ?? undefined,
  };
}

/** Synonyms of other pool words (same POS preferred), excluding near-collisions. */
function foreignSynonyms(target, pool, count, rng, correct) {
  const banned = new Set(
    [correct, target.word, ...target.synonyms, ...target.antonyms].map((s) => s.toLowerCase()),
  );
  const samePos = pool.filter((w) => w.id !== target.id && w.part_of_speech === target.part_of_speech);
  const others = pool.filter((w) => w.id !== target.id && w.part_of_speech !== target.part_of_speech);

  const result = [];
  for (const candidate of [...shuffle(samePos, rng), ...shuffle(others, rng)]) {
    for (const synonym of shuffle(candidate.synonyms, rng)) {
      if (banned.has(synonym.toLowerCase())) continue;
      banned.add(synonym.toLowerCase());
      result.push(synonym);
      break;
    }
    if (result.length === count) break;
  }
  return result;
}

function buildItem(word, mode, prompt, correct, distractors, rng) {
  const options = shuffle(
    [
      { id: 'correct', text: correct },
      ...distractors.map((text, i) => ({ id: `d${i}`, text })),
    ],
    rng,
  );
  return {
    kind: 'syn_ant',
    wordId: word.id,
    word: word.word,
    mode,
    prompt,
    options,
    correctOptionId: 'correct',
    explanation: word.definition ?? undefined,
  };
}
