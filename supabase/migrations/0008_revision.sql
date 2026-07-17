-- Revision: surface the SRS data record_attempt() has been maintaining all
-- along. word_progress.next_due / last_reviewed are written on every answer
-- (0002_user_tables.sql) but nothing has ever read them — weak_words only finds
-- words you get wrong, so a word you learned and never revisited is invisible.
--
-- Same conventions as 0003_views.sql: security_invoker so the caller's RLS
-- applies, plus an explicit auth.uid() scope.

-- Words due for review --------------------------------------------------------
-- Complements weak_words: due-ness is about time since practice, not mistakes.

create view public.due_words
with (security_invoker = on) as
select w.id,
       w.word,
       w.part_of_speech,
       w.definition,
       w.book,
       w.pack_id,
       wp.wrong_count,
       wp.correct_count,
       wp.mastery,
       wp.last_reviewed,
       wp.next_due,
       greatest(0, extract(day from now() - wp.last_reviewed)::int) as days_since_review
from public.word_progress wp
join public.words w on w.id = wp.word_id
where wp.user_id = auth.uid()
  and wp.next_due is not null
  and wp.next_due <= now()
order by wp.next_due asc;

-- Pack revision state ---------------------------------------------------------
-- Per-pack staleness, which no view exposed. `seen` decides what is revisable:
-- there is no "completed" flag in this schema, and requiring 100% mastery would
-- hide exactly the packs most worth revising.

create view public.pack_revision
with (security_invoker = on) as
select p.id as pack_id,
       p.book,
       p.pack_number,
       p.word_count,
       count(wp.*) as seen,
       count(wp.*) filter (where wp.next_due <= now()) as due,
       min(wp.next_due) as next_due,
       max(wp.last_reviewed) as last_reviewed
from public.packs p
join public.words w on w.pack_id = p.id
join public.word_progress wp
  on wp.word_id = w.id and wp.user_id = auth.uid()
group by p.id, p.book, p.pack_number, p.word_count;

-- No RPC for "words to revise": the client reads word_progress with the words
-- row embedded over the existing word_id FK, ordered by next_due. RLS already
-- scopes word_progress to the caller, so nothing extra is needed here — see
-- fetchRevisionWords() in src/api/queries.js.
