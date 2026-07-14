/**
 * P1 mock data shaped like the future Supabase rows (see plan §2).
 * Replaced by real queries in P2; the 20 words below are real rows from
 * public.words (book 1, ids 1–20).
 */

export interface Book {
  book: 1 | 2;
  title: string;
  subtitle: string;
  wordCount: number;
  packCount: number;
  progress: number; // 0..1 (mock)
}

export interface Pack {
  id: number;
  book: 1 | 2;
  packNumber: number;
  firstWord: string;
  lastWord: string;
  wordCount: number;
  progress: number; // 0..1 (mock)
}

export interface Word {
  id: number;
  word: string;
  pronunciation: string | null;
  partOfSpeech: string | null;
  definition: string | null;
  exampleSentences: string[];
  notes: string | null;
}

export const BOOKS: Book[] = [
  {
    book: 1,
    title: 'Word Smart 1',
    subtitle: 'Core Vocabulary Builder',
    wordCount: 832,
    packCount: 42,
    progress: 0.12,
  },
  {
    book: 2,
    title: 'Word Smart 2',
    subtitle: 'Advanced Contextual Usage',
    wordCount: 848,
    packCount: 43,
    progress: 0.04,
  },
];

const PACK_RANGES: [string, string][] = [
  ['Abash', 'Acrid'],
  ['Acrimonious', 'Aesthetic'],
  ['Affable', 'Allocate'],
  ['Alloy', 'Ambivalent'],
  ['Ameliorate', 'Anecdote'],
  ['Anguish', 'Aphorism'],
  ['Apocalypse', 'Arbiter'],
  ['Arbitrary', 'Artful'],
];

export const MOCK_PACKS: Pack[] = PACK_RANGES.map(([firstWord, lastWord], i) => ({
  id: i + 1,
  book: 1,
  packNumber: i + 1,
  firstWord,
  lastWord,
  wordCount: 20,
  progress: [1, 0.45, 0.2, 0, 0, 0, 0, 0][i],
}));

export const MOCK_WORDS: Word[] = [
  { id: 1, word: 'abash', pronunciation: 'uh BASH', partOfSpeech: 'v', definition: 'to make ashamed; to embarrass', exampleSentences: ['Meredith felt abashed by her inability to remember her lines in the school chorus of "Old McDonald Had a Farm."'], notes: 'To do something without shame or embarrassment is to do it unabashedly.' },
  { id: 2, word: 'abate', pronunciation: 'uh BAYT', partOfSpeech: 'v', definition: 'to subside; to reduce', exampleSentences: ['George spilled a cup of hot coffee on his leg. It hurt quite a bit. Then, gradually, the agony abated.'], notes: 'A tax abatement is a reduction in taxes.' },
  { id: 3, word: 'abdicate', pronunciation: 'AB duh kayt', partOfSpeech: 'v', definition: 'to step down from a position of power or responsibility', exampleSentences: ['When King Edward VIII of England decided he would rather be married to Wallis Warfield Simpson, an American divorcée, than be king of England, he turned in his crown and abdicated.'], notes: "Even people who aren't monarchs can abdicate their duties and responsibilities." },
  { id: 4, word: 'aberration', pronunciation: 'ab uh RAY shun', partOfSpeech: 'n', definition: 'something not typical; a deviation from the standard', exampleSentences: ["Søren's bad behavior was an aberration. So was Harry's good behavior."], notes: 'An aberration is an aberrant (uh BER unt) occurrence.' },
  { id: 5, word: 'abhor', pronunciation: 'ab HOR', partOfSpeech: 'v', definition: 'to hate very, very much; to detest', exampleSentences: ['Emanuel abhorred having to wake up before dawn.'], notes: 'To abhor something is to view it with horror.' },
  { id: 6, word: 'abject', pronunciation: 'AB jekt', partOfSpeech: 'adj', definition: 'hopeless; extremely sad and servile; defeated', exampleSentences: ['While most people would quickly recover from a stumble on stage, Mia felt abject humiliation.'], notes: 'An abject person is one who is crushed and without hope.' },
  { id: 7, word: 'abnegate', pronunciation: 'AB nuh gayt', partOfSpeech: 'v', definition: 'to deny oneself things; to reject; to renounce', exampleSentences: ['Ascetics practice self-abnegation because they believe it will bring them closer to spiritual purity.'], notes: 'Self-abnegation is giving up oneself, usually for some higher cause.' },
  { id: 8, word: 'abortive', pronunciation: 'uh BOR tiv', partOfSpeech: 'adj', definition: 'unsuccessful', exampleSentences: ['Marie and Elizabeth made an abortive effort to bake a birthday cake; that is, their effort did not result in a birthday cake.'], notes: 'To abort something is to end it before it is completed.' },
  { id: 9, word: 'abridge', pronunciation: 'uh BRIJ', partOfSpeech: 'v', definition: 'to shorten; to condense', exampleSentences: ['The thoughtful editor abridged the massive book by removing the boring parts.'], notes: null },
  { id: 10, word: 'absolute', pronunciation: 'AB suh loot', partOfSpeech: 'adj', definition: 'total; unlimited', exampleSentences: ['An absolute ruler is one who is ruled by no one else.'], notes: 'Absolute is also a noun: something total, unlimited, or perfect.' },
  { id: 11, word: 'absolve', pronunciation: 'ab ZOLV', partOfSpeech: 'v', definition: 'to forgive or free from blame; to free from sin; to free from an obligation', exampleSentences: ['The priest absolved the sinner who had come to church to confess.'], notes: null },
  { id: 12, word: 'abstinent', pronunciation: 'AB stuh nunt', partOfSpeech: 'adj', definition: 'abstaining; voluntarily not doing something', exampleSentences: ["Beulah used to be a chain-smoker; now she's abstinent."], notes: null },
  { id: 13, word: 'abstract', pronunciation: 'AB strakt', partOfSpeech: 'adj', definition: 'theoretical; impersonal', exampleSentences: ['He liked oysters in the abstract, but when he actually tried one he became nauseated.'], notes: null },
  { id: 14, word: 'abstruse', pronunciation: 'ab STROOS', partOfSpeech: 'adj', definition: 'hard to understand', exampleSentences: ["The professor's article, on the meaning of meaning, was abstruse."], notes: null },
  { id: 15, word: 'abysmal', pronunciation: 'uh BIZ mul', partOfSpeech: 'adj', definition: 'extremely hopeless or wretched; bottomless', exampleSentences: ["The nation's debt crisis was abysmal; there seemed to be no possible solution."], notes: null },
  { id: 16, word: 'accolade', pronunciation: 'AK uh layd', partOfSpeech: 'n', definition: 'an award; an honor', exampleSentences: ['The movie won every accolade the critics could bestow.'], notes: 'This word is generally used in the plural.' },
  { id: 17, word: 'accost', pronunciation: 'uh KAWST', partOfSpeech: 'v', definition: 'to approach and speak to someone aggressively', exampleSentences: ['Amanda karate-chopped the stranger who accosted her in the street and was embarrassed to find he was an old, blind man.'], notes: null },
  { id: 18, word: 'acerbic', pronunciation: 'uh SUR bik', partOfSpeech: 'adj', definition: 'sour; severe; like acid in temper, mood, or tone', exampleSentences: ["Barry sat silently as his friends read the teacher's acerbic comments on his paper."], notes: null },
  { id: 19, word: 'acquiesce', pronunciation: 'ak wee ES', partOfSpeech: 'v', definition: 'to comply passively; to accept; to assent; to agree', exampleSentences: ['The pirates asked Pete to walk the plank; he took one look at their swords and then acquiesced.'], notes: null },
  { id: 20, word: 'acrid', pronunciation: 'AK rid', partOfSpeech: 'adj', definition: 'harshly pungent; bitter', exampleSentences: ['The cheese we had at the party had an acrid taste; it was harsh and unpleasant.'], notes: null },
];

export const POS_LABELS: Record<string, string> = {
  v: 'Verb',
  n: 'Noun',
  adj: 'Adjective',
  adv: 'Adverb',
};
