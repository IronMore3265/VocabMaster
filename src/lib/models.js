// Static domain metadata + small formatting helpers (ported from types/models.ts).

export const POS_LABELS = {
  v: 'Verb',
  n: 'Noun',
  adj: 'Adjective',
  adv: 'Adverb',
};

export const BOOKS_META = [
  { book: 1, title: 'Word Smart 1', subtitle: 'Core Vocabulary Builder' },
  { book: 2, title: 'Word Smart 2', subtitle: 'Advanced Contextual Usage' },
];

export const EXERCISE_LABELS = {
  flashcard: 'Flashcards',
  matching: 'Matching',
  fill_blank: 'Fill-in-the-blanks',
  syn_ant: 'Synonym/Antonym',
  ai_mixed: 'AI Sessions',
};

const cap = (w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : '');

export function packTitle(pack) {
  return `Pack ${pack.pack_number}: ${cap(pack.first_word)} – ${cap(pack.last_word)}`;
}

export function posLabel(pos) {
  if (!pos) return '';
  return POS_LABELS[pos] ?? pos;
}
