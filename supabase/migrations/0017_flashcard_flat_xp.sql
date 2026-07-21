-- v7.2.6 — flashcards are a flat 2 XP, retroactively.
--
-- Since v7.2.1 "Again" re-studies a card and records nothing, so a flashcard is
-- never logged as a miss. The client already treats every flashcard as a flat
-- 2 XP (XP_WEIGHTS.flashcard in src/api/queries.js). This brings xp_for() — the
-- server's single source of XP truth — in lockstep.
--
-- XP is never stored; every total, streak and friend stat is summed on the fly
-- through xp_for(). Redefining the function therefore recomputes *already earned*
-- XP too: the historical flashcard attempts logged with is_correct = false
-- (from before v7.2.1's grading change) jump from 1 XP to 2 everywhere they are
-- counted. No data backfill is needed.

create or replace function public.xp_for(p_type public.exercise_type, p_correct boolean)
returns int
language sql
immutable
set search_path = ''
as $$
  select case
    when p_type = 'flashcard' then 2
    else case when p_correct then 5 else 1 end
  end;
$$;
