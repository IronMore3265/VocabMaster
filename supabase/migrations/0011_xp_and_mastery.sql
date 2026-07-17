-- v6.0.0 — XP, honest mastery, goal-gated streaks, and streak freeze.
--
-- Four intertwined changes, all here because they share the same day-bucketing
-- and goal math:
--
--   * XP: xp_for() is the single source of truth for how many points an answer
--     is worth (flashcard 2/1, every other exercise 5/1). Streaks are no longer
--     "practised at all" — a day counts only once its summed XP meets the user's
--     daily_goal (50/100/250).
--   * Mastery: record_attempt only advances the SRS box on a genuinely *due*
--     review, so cramming a word four times in a minute no longer "masters" it.
--     "Mastered" moves from mastery >= 4 to the top box, >= 5.
--   * Streak freeze: a missed day is auto-covered by a freeze (cap 2, refills one
--     per week) via refresh_streak_state(), which the client calls on app open.
--   * Friend surfaces: friend_stats/mutual_streaks become goal- and freeze-aware,
--     "attempts" is replaced by "packs completed", and friend_xp_series() feeds
--     the compare line chart.

-- XP weight: the one place that decides what an answer is worth. Mirrored in
-- src/api/queries.js xpFor() — keep the two in lockstep.
create or replace function public.xp_for(p_type public.exercise_type, p_correct boolean)
returns int
language sql
immutable
set search_path = ''
as $$
  select case
    when p_type = 'flashcard' then case when p_correct then 2 else 1 end
    else case when p_correct then 5 else 1 end
  end;
$$;

-- Daily XP goal + streak-freeze inventory on the profile ----------------------
-- daily_goal drives the streak; it is user-set from Settings through the
-- existing "Own profile update" policy, so no write RPC is needed. streak_freezes
-- and freeze_refilled_at are managed only by refresh_streak_state().

alter table public.profiles
  add column if not exists daily_goal int not null default 100
    check (daily_goal in (50, 100, 250)),
  add column if not exists streak_freezes int not null default 2
    check (streak_freezes between 0 and 2),
  add column if not exists freeze_refilled_at date not null default (now() at time zone 'UTC')::date;

-- Missed days a freeze has covered. Treated as "qualifying" by every streak
-- calc, so a frozen day keeps a run unbroken. Written only by the security
-- definer refresh_streak_state(); readable by its owner.
create table if not exists public.streak_freeze_days (
  user_id uuid not null references auth.users on delete cascade,
  day     date not null,
  primary key (user_id, day)
);

alter table public.streak_freeze_days enable row level security;

create policy "Own freeze days read" on public.streak_freeze_days
  for select to authenticated using (auth.uid() = user_id);

-- record_attempt: strict SRS ---------------------------------------------------
-- Mastery only climbs on a due review. Correct-but-early answers are logged (they
-- still earn XP and count toward accuracy) but do not advance the box or reset
-- next_due, so a single cramming session can't fast-track "mastered".
-- SRS intervals by box (1..5): 1/3/7/14/30 days. Mastered = box 5.

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

-- "Mastered" is now the top box (>= 5) everywhere ------------------------------
-- Reaching box 5 means the word survived the full 1/3/7/14-day review ladder, so
-- it is genuinely earned over ~25 days rather than four flips in a minute.

create or replace view public.pack_progress
with (security_invoker = on) as
select p.id as pack_id,
       p.book,
       p.pack_number,
       p.word_count,
       count(wp.*) filter (where wp.mastery >= 5) as mastered,
       count(wp.*) filter (where wp.mastery >= 1) as seen
from public.packs p
left join public.words w on w.pack_id = p.id
left join public.word_progress wp
  on wp.word_id = w.id and wp.user_id = auth.uid()
group by p.id, p.book, p.pack_number, p.word_count;

-- Streak state: refill + auto-consume freezes, return the current streak -------
-- No daily cron exists, so this does the day-boundary bookkeeping on demand when
-- the client opens the app. Refills first (one freeze per full week, cap 2), then
-- covers a coverable gap of missed days with freezes so an active streak
-- survives, then recomputes the streak (a day qualifies if its XP >= goal OR it
-- is a frozen day). Idempotent within a day: frozen days read back as qualifying.

create function public.refresh_streak_state(p_tz text default 'UTC')
returns table (out_streak int, out_freezes int, out_refilled_at date)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_tz      text := coalesce(nullif(trim(p_tz), ''), 'UTC');
  v_today   date;
  v_goal    int;
  v_freezes int;
  v_refill  date;
  v_weeks   int;
  v_last    date;
  v_gap     int;
begin
  if v_user is null then
    raise exception 'refresh_streak_state: not authenticated';
  end if;
  if not exists (select 1 from pg_timezone_names where name = v_tz) then
    v_tz := 'UTC';
  end if;
  v_today := (now() at time zone v_tz)::date;

  select daily_goal, streak_freezes, freeze_refilled_at
    into v_goal, v_freezes, v_refill
  from public.profiles where id = v_user;

  -- Refill: +1 per full week elapsed, capped at 2.
  v_weeks := floor((v_today - v_refill) / 7.0)::int;
  if v_weeks > 0 then
    v_freezes := least(2, v_freezes + v_weeks);
    v_refill  := v_refill + (v_weeks * 7);
  end if;

  -- Most recent qualifying day strictly before today: goal met, or already frozen.
  select max(day) into v_last from (
    select x.day from (
      select (a.created_at at time zone v_tz)::date as day,
             sum(public.xp_for(a.exercise_type, a.is_correct)) as xp
      from public.attempts a where a.user_id = v_user
      group by 1
    ) x where x.xp >= v_goal and x.day < v_today
    union
    select day from public.streak_freeze_days
    where user_id = v_user and day < v_today
  ) q;

  -- A coverable gap of missed days between v_last and yesterday: freeze them so
  -- the streak survives. Only spend freezes when they fully bridge the gap —
  -- a partial cover would break the streak anyway.
  if v_last is not null and v_last < v_today - 1 then
    v_gap := (v_today - 1) - v_last; -- missed days: v_last+1 .. v_today-1
    if v_gap >= 1 and v_gap <= v_freezes then
      insert into public.streak_freeze_days (user_id, day)
      select v_user, g::date
      from generate_series((v_last + 1)::timestamp, (v_today - 1)::timestamp, interval '1 day') g
      on conflict do nothing;
      v_freezes := v_freezes - v_gap;
    end if;
  end if;

  update public.profiles
    set streak_freezes = v_freezes, freeze_refilled_at = v_refill
    where id = v_user;

  return query
  with gd as (
    select x.day from (
      select (a.created_at at time zone v_tz)::date as day,
             sum(public.xp_for(a.exercise_type, a.is_correct)) as xp
      from public.attempts a where a.user_id = v_user
      group by 1
    ) x where x.xp >= v_goal
    union
    select day from public.streak_freeze_days where user_id = v_user
  ),
  runs as (
    select day, (day - (row_number() over (order by day))::int) as grp from gd
  ),
  best as (
    select count(*)::int as len, max(day) as ends from runs group by grp
  )
  select coalesce((
           select b.len from best b
           where b.ends >= v_today - 1
           order by b.ends desc limit 1
         ), 0),
         v_freezes,
         v_refill;
end;
$$;

revoke execute on function public.refresh_streak_state from public, anon;
grant execute on function public.refresh_streak_state to authenticated;

comment on function public.refresh_streak_state(text) is
  'Refills/auto-consumes streak freezes at the day boundary and returns the caller''s current goal-gated streak, bucketed in the caller''s timezone.';

-- friend_stats: goal-gated + freeze-aware, packs replace attempts, mastered >= 5
-- Return type changes (out_attempts -> out_packs), so the 0009 overload must be
-- dropped rather than replaced.

drop function public.friend_stats(uuid, text);

create function public.friend_stats(p_friend_id uuid, p_tz text default 'UTC')
returns table (
  out_friend_id    uuid,
  out_display_name text,
  out_packs        bigint,
  out_accuracy     numeric,
  out_mastered     bigint,
  out_streak       int,
  out_total_xp     bigint,
  out_last_active  timestamptz
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_tz   text := coalesce(nullif(trim(p_tz), ''), 'UTC');
  v_goal int;
begin
  if v_user is null then
    raise exception 'friend_stats: not authenticated';
  end if;
  if not exists (
    select 1 from public.friendships f
    where f.user_id = v_user and f.friend_id = p_friend_id and f.status = 'accepted'
  ) then
    raise exception 'Not connected to that user';
  end if;
  if not exists (select 1 from pg_timezone_names where name = v_tz) then
    v_tz := 'UTC';
  end if;

  select daily_goal into v_goal from public.profiles where id = p_friend_id;

  return query
  with a as (
    select avg(is_correct::int)::numeric(4, 3) as acc,
           max(created_at) as last_at,
           coalesce(sum(public.xp_for(exercise_type, is_correct)), 0) as xp
    from public.attempts where user_id = p_friend_id
  ),
  m as (
    select count(*) as n from public.word_progress
    where user_id = p_friend_id and mastery >= 5
  ),
  -- Packs where the friend has mastered every word.
  pk as (
    select count(*)::bigint as n
    from public.packs p
    where p.word_count > 0 and p.word_count = (
      select count(*) from public.word_progress wp
      join public.words w on w.id = wp.word_id
      where wp.user_id = p_friend_id and w.pack_id = p.id and wp.mastery >= 5
    )
  ),
  -- Goal-gated qualifying days (XP met that day, or a frozen day), caller's zone.
  gd as (
    select x.day from (
      select (att.created_at at time zone v_tz)::date as day,
             sum(public.xp_for(att.exercise_type, att.is_correct)) as xp
      from public.attempts att where att.user_id = p_friend_id
      group by 1
    ) x where x.xp >= v_goal
    union
    select day from public.streak_freeze_days where user_id = p_friend_id
  ),
  runs as (
    select day, (day - (row_number() over (order by day))::int) as grp from gd
  ),
  best as (
    select count(*)::int as len, max(day) as ends from runs group by grp
  )
  select p_friend_id,
         p.display_name,
         coalesce(pk.n, 0),
         coalesce(a.acc, 0),
         coalesce(m.n, 0),
         coalesce((
           select b.len from best b
           where b.ends >= (now() at time zone v_tz)::date - 1
           order by b.ends desc limit 1
         ), 0),
         coalesce(a.xp, 0),
         a.last_at
  from public.profiles p, a, m, pk
  where p.id = p_friend_id;
end;
$$;

revoke execute on function public.friend_stats from public, anon;
grant execute on function public.friend_stats to authenticated;

-- mutual_streaks: a shared day now needs BOTH members to have hit their own goal
-- (or have that day frozen), not merely practised.

create or replace function public.mutual_streaks(p_tz text default 'UTC')
returns table (
  out_friend_id       uuid,
  out_streak          int,
  out_last_mutual_day date
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_tz      text := coalesce(nullif(trim(p_tz), ''), 'UTC');
  v_my_goal int;
  v_today   date;
begin
  if v_user is null then
    raise exception 'mutual_streaks: not authenticated';
  end if;
  if not exists (select 1 from pg_timezone_names where name = v_tz) then
    v_tz := 'UTC';
  end if;
  v_today := (now() at time zone v_tz)::date;
  select daily_goal into v_my_goal from public.profiles where id = v_user;

  return query
  with friends as (
    select f.friend_id as fid from public.friendships f
    where f.user_id = v_user and f.status = 'accepted'
  ),
  fgoals as (
    select fr.fid, pr.daily_goal from friends fr join public.profiles pr on pr.id = fr.fid
  ),
  -- My qualifying days (goal met, or frozen), last 400 days.
  my_xp as (
    select (a.created_at at time zone v_tz)::date as day,
           sum(public.xp_for(a.exercise_type, a.is_correct)) as xp
    from public.attempts a
    where a.user_id = v_user and a.created_at >= now() - interval '400 days'
    group by 1
  ),
  mine as (
    select day from my_xp where xp >= v_my_goal
    union
    select day from public.streak_freeze_days where user_id = v_user
  ),
  -- Each friend's qualifying days (their own goal, or their frozen days).
  their_xp as (
    select fr.fid, (a.created_at at time zone v_tz)::date as day,
           sum(public.xp_for(a.exercise_type, a.is_correct)) as xp
    from friends fr
    join public.attempts a on a.user_id = fr.fid
    where a.created_at >= now() - interval '400 days'
    group by fr.fid, 2
  ),
  theirs as (
    select tx.fid, tx.day
    from their_xp tx join fgoals g on g.fid = tx.fid
    where tx.xp >= g.daily_goal
    union
    select fr.fid, sf.day
    from public.streak_freeze_days sf
    join friends fr on fr.fid = sf.user_id
  ),
  both_days as (
    select t.fid, t.day
    from theirs t join mine m on m.day = t.day
  ),
  runs as (
    select b.fid, b.day,
           b.day - (row_number() over (partition by b.fid order by b.day))::int as grp
    from both_days b
  ),
  islands as (
    select r.fid, count(*)::int as len, max(r.day) as ends
    from runs r
    group by r.fid, r.grp
  )
  select fr.fid,
         coalesce((
           select i.len from islands i
           where i.fid = fr.fid and i.ends >= v_today - 1
           order by i.ends desc limit 1
         ), 0),
         (select max(i2.ends) from islands i2 where i2.fid = fr.fid)
  from friends fr;
end;
$$;

revoke execute on function public.mutual_streaks from public, anon;
grant execute on function public.mutual_streaks to authenticated;

-- friend_xp_series: per-day XP for a friend, zero-filled, for the compare chart.

create function public.friend_xp_series(p_friend_id uuid, p_days int default 30, p_tz text default 'UTC')
returns table (out_day date, out_xp int)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_tz   text := coalesce(nullif(trim(p_tz), ''), 'UTC');
  v_days int  := least(greatest(coalesce(p_days, 30), 1), 120);
  v_today date;
begin
  if v_user is null then
    raise exception 'friend_xp_series: not authenticated';
  end if;
  if not exists (
    select 1 from public.friendships f
    where f.user_id = v_user and f.friend_id = p_friend_id and f.status = 'accepted'
  ) then
    raise exception 'Not connected to that user';
  end if;
  if not exists (select 1 from pg_timezone_names where name = v_tz) then
    v_tz := 'UTC';
  end if;
  v_today := (now() at time zone v_tz)::date;

  return query
  select d::date,
         coalesce((
           select sum(public.xp_for(a.exercise_type, a.is_correct))::int
           from public.attempts a
           where a.user_id = p_friend_id
             and (a.created_at at time zone v_tz)::date = d::date
         ), 0)
  from generate_series(
    (v_today - (v_days - 1))::timestamp,
    v_today::timestamp,
    interval '1 day'
  ) d;
end;
$$;

revoke execute on function public.friend_xp_series from public, anon;
grant execute on function public.friend_xp_series to authenticated;

-- Realtime: the client subscribes to its own friendships rows so a request or an
-- acceptance from another device shows up at once. RLS still applies to the
-- stream, so a user only ever receives rows they can already read.
alter publication supabase_realtime add table public.friendships;
