import type { WordRow } from '@/types/models';

import { shuffle } from './rng';

/**
 * Picks distractor words for an MCQ about `target`.
 * Pool priority: same part of speech first, then anything else. Candidates are
 * excluded when their definition mentions the target headword (or vice versa)
 * or duplicates another candidate's definition.
 */
export function pickDistractors(
  target: WordRow,
  pool: readonly WordRow[],
  count: number,
  rng: () => number,
): WordRow[] {
  const targetStem = stem(target.word);

  const usable = pool.filter((candidate) => {
    if (candidate.id === target.id || !candidate.definition) return false;
    const candidateDef = candidate.definition.toLowerCase();
    const targetDef = (target.definition ?? '').toLowerCase();
    if (candidateDef.includes(targetStem)) return false;
    if (targetDef.includes(stem(candidate.word))) return false;
    return true;
  });

  const samePos = usable.filter((c) => c.part_of_speech === target.part_of_speech);
  const rest = usable.filter((c) => c.part_of_speech !== target.part_of_speech);

  const picked: WordRow[] = [];
  const seenDefinitions = new Set<string>([normalizeDef(target.definition ?? '')]);
  for (const candidate of [...shuffle(samePos, rng), ...shuffle(rest, rng)]) {
    const def = normalizeDef(candidate.definition ?? '');
    if (seenDefinitions.has(def)) continue;
    seenDefinitions.add(def);
    picked.push(candidate);
    if (picked.length === count) break;
  }
  return picked;
}

/** Crude stem: lower-cased word minus a trailing e/y, for inflection matching. */
export function stem(word: string): string {
  return word.toLowerCase().replace(/[ey]$/, '');
}

function normalizeDef(definition: string): string {
  return definition.trim().toLowerCase();
}

/** First clause of a definition, capped for compact option/pair labels. */
export function shortDefinition(definition: string, maxLength = 90): string {
  const clause = definition.split(';')[0].trim();
  if (clause.length <= maxLength) return clause;
  return `${clause.slice(0, maxLength - 1).trimEnd()}…`;
}
