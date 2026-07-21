-- v7.0.0 — Progress vs. mastery split + flashcards as pure review.
--
-- Three related changes:
--   * record_attempt: a 'flashcard' answer is now pure review — it still logs an
--     attempt (so it earns XP and counts toward pack coverage) but no longer
--     touches word_progress, so flipping cards can neither advance nor demote the
--     SRS box. Mastery is earned only through the graded exercises.
--   * exercise_accuracy: drops 'flashcard' entirely, since a self-graded review
--     has no meaningful right/wrong to average.
--   * pack_coverage (new): the data behind the blue "Progress" bar —
--     reviewed = distinct words seen in flashcards; practiced = distinct
--     (word, exercise) correct pairs across the three graded exercises. The client
--     turns these into 0.25·(reviewed/N) + 0.75·(practiced/3N).

-- record_attempt: flashcards log only; graded types keep the strict SRS ladder ---
create or replace function public.record_attempt(
  p_word_id bigint,
  p_pack_id bigint,
  p_type    public.exercise_type,
  p_correct boolean
) returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user      uuid := auth.uid();
  v_intervals constant int[] := array[1, 3, 7, 14, 30];
  v_mastery   int;
  v_due       timestamptz;
  v_new_mast  int;
begin
  if v_user is null then
    raise exception 'record_attempt: not authenticated';
  end if;

  insert into public.attempts (user_id, word_id, pack_id, exercise_type, is_correct)
  values (v_user, p_word_id, p_pack_id, p_type, p_correct);

  -- Flashcards are review-only: logged for XP + coverage, but never move the SRS
  -- box. Everything below is the graded-exercise mastery ladder.
  if p_type = 'flashcard' then
    return;
  end if;

  select mastery, next_due into v_mastery, v_due
  from public.word_progress
  where user_id = v_user and word_id = p_word_id;

  if not found then
    -- First ever answer for this word.
    v_new_mast := (p_correct)::int; -- 1 if correct, else 0
    insert into public.word_progress
      (user_id, word_id, correct_count, wrong_count, mastery, last_reviewed, next_due)
    values (
      v_user, p_word_id,
      (p_correct)::int, (not p_correct)::int,
      v_new_mast, now(),
      now() + make_interval(days => v_intervals[greatest(1, v_new_mast)])
    );
  elsif not p_correct then
    -- Wrong: always demote and drop back down the ladder.
    v_new_mast := greatest(0, v_mastery - 1);
    update public.word_progress
    set wrong_count   = wrong_count + 1,
        mastery       = v_new_mast,
        last_reviewed = now(),
        next_due      = now() + make_interval(days => v_intervals[greatest(1, v_new_mast)])
    where user_id = v_user and word_id = p_word_id;
  elsif v_due is null or now() >= v_due then
    -- Correct and genuinely due: advance one box.
    v_new_mast := least(5, v_mastery + 1);
    update public.word_progress
    set correct_count = correct_count + 1,
        mastery       = v_new_mast,
        last_reviewed = now(),
        next_due      = now() + make_interval(days => v_intervals[v_new_mast])
    where user_id = v_user and word_id = p_word_id;
  else
    -- Correct but not due (cramming): count the win, keep the box and schedule.
    update public.word_progress
    set correct_count = correct_count + 1,
        last_reviewed = now()
    where user_id = v_user and word_id = p_word_id;
  end if;
end;
$$;

revoke execute on function public.record_attempt from public, anon;
grant execute on function public.record_attempt to authenticated;

-- Accuracy-by-exercise excludes flashcards (no meaningful right/wrong) -----------
create or replace view public.exercise_accuracy
with (security_invoker = on) as
select exercise_type,
       count(*) as attempts,
       avg(is_correct::int)::numeric(4, 3) as accuracy
from public.attempts
where user_id = auth.uid()
  and exercise_type <> 'flashcard'
group by exercise_type;

-- pack_coverage: data for the blue "Progress" bar (distinct from SRS mastery) ----
-- reviewed  = distinct words the user has seen in flashcards (fills the 25%).
-- practiced = distinct (word, exercise) correct answers across the three graded
--             exercises (fills the 75%; max is 3 * word_count).
create view public.pack_coverage
with (security_invoker = on) as
select p.id as pack_id,
       p.word_count,
       count(distinct a.word_id)
         filter (where a.exercise_type = 'flashcard') as reviewed,
       count(distinct (a.word_id, a.exercise_type))
         filter (where a.is_correct
                   and a.exercise_type in ('matching', 'fill_blank', 'syn_ant')) as practiced
from public.packs p
left join public.attempts a
  on a.pack_id = p.id and a.user_id = auth.uid()
group by p.id, p.word_count;
