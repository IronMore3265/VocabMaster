import { beforeEach, describe, expect, it } from '@jest/globals';

import type { WordRow } from '@/types/models';

import { pickDistractors, shortDefinition, stem } from '../distractors';
import { blankSentence, makeFillBlankItems } from '../fillBlank';
import { makeMatchingRounds } from '../matching';
import { mulberry32, shuffle } from '../rng';
import { makeSynAntItems } from '../synAnt';

let nextId = 1;
function word(overrides: Partial<WordRow>): WordRow {
  return {
    id: nextId++,
    word: `word${nextId}`,
    pronunciation: null,
    part_of_speech: 'v',
    definition: `definition ${nextId}`,
    example_sentences: [],
    notes: null,
    book: 1,
    pack_id: 1,
    first_letter: null,
    created_at: '2026-01-01',
    synonyms: [],
    antonyms: [],
    enriched_at: null,
    ...overrides,
  };
}

function makePack(count: number, overrides: (i: number) => Partial<WordRow> = () => ({})): WordRow[] {
  return Array.from({ length: count }, (_, i) =>
    word({ word: `target${i}`, definition: `meaning number ${i}`, ...overrides(i) }),
  );
}

beforeEach(() => {
  nextId = 1;
});

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = shuffle([1, 2, 3, 4, 5, 6, 7, 8], mulberry32(42));
    const b = shuffle([1, 2, 3, 4, 5, 6, 7, 8], mulberry32(42));
    expect(a).toEqual(b);
  });
});

describe('stem', () => {
  it('drops trailing e/y so inflections match', () => {
    expect(stem('abate')).toBe('abat'); // matches "abating"
    expect(stem('happy')).toBe('happ'); // matches "happiness"
    expect(stem('abhor')).toBe('abhor');
  });
});

describe('pickDistractors', () => {
  it('excludes candidates whose definition mentions the target', () => {
    const target = word({ word: 'abate', definition: 'to subside' });
    const pool = [
      target,
      word({ word: 'other1', definition: 'to abate slowly' }), // mentions target
      word({ word: 'other2', definition: 'plain meaning a' }),
      word({ word: 'other3', definition: 'plain meaning b' }),
      word({ word: 'other4', definition: 'plain meaning c' }),
    ];
    const picked = pickDistractors(target, pool, 3, mulberry32(1));
    expect(picked.map((w) => w.word)).not.toContain('other1');
    expect(picked).toHaveLength(3);
  });

  it('dedupes identical definitions', () => {
    const target = word({ word: 'abate', definition: 'to subside' });
    const pool = [
      target,
      word({ word: 'dupA', definition: 'same meaning' }),
      word({ word: 'dupB', definition: 'same meaning' }),
      word({ word: 'unique', definition: 'another meaning' }),
    ];
    const picked = pickDistractors(target, pool, 3, mulberry32(1));
    const defs = picked.map((w) => w.definition);
    expect(new Set(defs).size).toBe(defs.length);
    expect(picked.length).toBe(2); // only 2 distinct usable definitions exist
  });
});

describe('blankSentence', () => {
  it('blanks inflected forms of the headword', () => {
    const w = word({
      word: 'abate',
      example_sentences: ['Gradually, the agony abated completely.'],
    });
    expect(blankSentence(w, mulberry32(1))).toBe('Gradually, the agony _____ completely.');
  });

  it('returns null when no sentence contains the word', () => {
    const w = word({ word: 'abate', example_sentences: ['A sentence about something else.'] });
    expect(blankSentence(w, mulberry32(1))).toBeNull();
  });

  it('returns null for empty example_sentences', () => {
    const w = word({ word: 'abate', example_sentences: [] });
    expect(blankSentence(w, mulberry32(1))).toBeNull();
  });
});

describe('makeFillBlankItems', () => {
  it('falls back to a definition MCQ when the word never appears in its sentences', () => {
    const pack = makePack(6, (i) => ({
      example_sentences: i === 0 ? ['No headword here at all.'] : [`This sentence uses target${i} clearly.`],
    }));
    const items = makeFillBlankItems(pack, 7);
    const fallback = items.find((item) => item.word === 'target0');
    expect(fallback?.kind).toBe('mcq_definition');
    expect(fallback?.prompt).toContain('Which word means');
    const normal = items.find((item) => item.word === 'target3');
    expect(normal?.kind).toBe('fill_blank');
    expect(normal?.prompt).toContain('_____');
  });

  it('always includes the correct word among 4 options', () => {
    const pack = makePack(8, (i) => ({
      example_sentences: [`Sentence with target${i} inside.`],
    }));
    for (const item of makeFillBlankItems(pack, 3)) {
      expect(item.options).toHaveLength(4);
      const correct = item.options.find((o) => o.id === item.correctOptionId);
      expect(correct?.text).toBe(item.word);
    }
  });
});

describe('makeMatchingRounds', () => {
  it('chunks 20 words into 4 rounds of 5 pairs', () => {
    const rounds = makeMatchingRounds(makePack(20), 5);
    expect(rounds).toHaveLength(4);
    expect(rounds.every((round) => round.pairs.length === 5)).toBe(true);
  });

  it('handles a short last pack (12 words -> 5+5+2)', () => {
    const rounds = makeMatchingRounds(makePack(12), 5);
    expect(rounds.map((round) => round.pairs.length)).toEqual([5, 5, 2]);
  });

  it('skips words without definitions', () => {
    const pack = makePack(6, (i) => (i === 0 ? { definition: null } : {}));
    const rounds = makeMatchingRounds(pack, 5);
    const total = rounds.reduce((sum, round) => sum + round.pairs.length, 0);
    expect(total).toBe(5);
  });
});

describe('makeSynAntItems', () => {
  it('uses closest-in-meaning fallback when synonyms are empty', () => {
    const items = makeSynAntItems(makePack(6), 11);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.prompt).toContain('closest in meaning');
    }
  });

  it('builds synonym MCQs from enriched columns', () => {
    const pack = makePack(6, (i) => ({
      synonyms: [`syn${i}a`, `syn${i}b`],
    }));
    const items = makeSynAntItems(pack, 11);
    const synItem = items.find((item) => item.prompt.includes('synonym'));
    expect(synItem).toBeDefined();
    const correct = synItem!.options.find((o) => o.id === synItem!.correctOptionId)!;
    const targetIndex = Number(synItem!.word.replace('target', ''));
    expect([`syn${targetIndex}a`, `syn${targetIndex}b`]).toContain(correct.text);
  });
});

describe('shortDefinition', () => {
  it('takes the first clause and caps length', () => {
    expect(shortDefinition('to subside; to reduce')).toBe('to subside');
    expect(shortDefinition('x'.repeat(200)).length).toBeLessThanOrEqual(90);
  });
});
