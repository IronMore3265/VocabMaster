import type { Enums, Tables } from './database';

export type WordRow = Tables<'words'>;
export type PackRow = Tables<'packs'>;
export type PackProgressRow = Tables<'pack_progress'>;
export type WeakWordRow = Tables<'weak_words'>;
export type ExerciseType = Enums<'exercise_type'>;

export const POS_LABELS: Record<string, string> = {
  v: 'Verb',
  n: 'Noun',
  adj: 'Adjective',
  adv: 'Adverb',
};

export interface BookMeta {
  book: number;
  title: string;
  subtitle: string;
}

export const BOOKS_META: BookMeta[] = [
  { book: 1, title: 'Word Smart 1', subtitle: 'Core Vocabulary Builder' },
  { book: 2, title: 'Word Smart 2', subtitle: 'Advanced Contextual Usage' },
];

export function packTitle(pack: Pick<PackRow, 'pack_number' | 'first_word' | 'last_word'>): string {
  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
  return `Pack ${pack.pack_number}: ${cap(pack.first_word)} – ${cap(pack.last_word)}`;
}
