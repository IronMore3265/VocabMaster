-- Analytics views. All security_invoker so RLS on the underlying tables
-- applies to the calling user; each is additionally scoped to auth.uid().

create view public.pack_progress
with (security_invoker = on) as
select p.id as pack_id,
       p.book,
       p.pack_number,
       p.word_count,
       count(wp.*) filter (where wp.mastery >= 4) as mastered,
       count(wp.*) filter (where wp.mastery >= 1) as seen
from public.packs p
left join public.words w on w.pack_id = p.id
left join public.word_progress wp
  on wp.word_id = w.id and wp.user_id = auth.uid()
group by p.id, p.book, p.pack_number, p.word_count;

create view public.exercise_accuracy
with (security_invoker = on) as
select exercise_type,
       count(*) as attempts,
       avg(is_correct::int)::numeric(4, 3) as accuracy
from public.attempts
where user_id = auth.uid()
group by exercise_type;

create view public.weak_words
with (security_invoker = on) as
select w.id,
       w.word,
       w.part_of_speech,
       w.definition,
       w.book,
       w.pack_id,
       wp.wrong_count,
       wp.correct_count,
       wp.mastery
from public.word_progress wp
join public.words w on w.id = wp.word_id
where wp.user_id = auth.uid()
  and wp.wrong_count >= 2
  and wp.wrong_count > wp.correct_count / 2.0
order by wp.wrong_count desc, wp.mastery asc;
