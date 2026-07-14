-- Columns filled by scripts/enrich-words.ts (Gemini batch): curated synonyms/
-- antonyms for quiz generation, plus extra example sentences appended to
-- example_sentences. enriched_at makes the batch resumable.
alter table public.words
  add column synonyms text[] not null default '{}',
  add column antonyms text[] not null default '{}',
  add column enriched_at timestamptz;
