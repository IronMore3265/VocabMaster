-- v7.2.0 — Reset progress + "who's done today" for the friend-streak fire.
--
-- Two changes:
--
--   * reset_progress(): self-service fresh start. Wipes the caller's learning
--     history (attempts, word_progress, streak_freeze_days, ai_suggestions) and
--     restores the streak-freeze inventory to its starting state, while leaving
--     the account itself — profile, friendships, freeze gifts, bookmarks —
--     untouched. The Settings "Delete account" flow was the only way to start
--     over before, which threw away friends along with the progress.
--
--   * mutual_streaks(): additionally reports whether each friend has already
--     hit their OWN daily goal today (caller's timezone), so the client can
--     light the shared fire half-lit when one of the pair is done and fully
--     filled once both are. The caller's own "done today" is client-side
--     knowledge (fetchMyStats), so it is not returned here.

-- Reset progress ---------------------------------------------------------------
-- SECURITY DEFINER because attempts / word_progress / streak_freeze_days have no
-- client delete policies (all writes go through RPCs); auth.uid() still resolves
-- from the request JWT, so a caller can only ever reset themselves.

create function public.reset_progress()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'reset_progress: not authenticated';
  end if;

  delete from public.attempts           where user_id = v_user;
  delete from public.word_progress      where user_id = v_user;
  delete from public.streak_freeze_days where user_id = v_user;
  -- AI sessions are built from the now-deleted history, so they go too.
  delete from public.ai_suggestions     where user_id = v_user;

  -- Back to the newcomer's freeze inventory. daily_goal is a preference, not
  -- progress, so it stays. freeze_gifts stay: they carry the per-friend gift
  -- cooldown, which belongs to the friendship, not the progress.
  update public.profiles
    set streak_freezes     = 2,
        freeze_refilled_at = (now() at time zone 'UTC')::date
    where id = v_user;
end;
$$;

revoke all on function public.reset_progress() from public, anon;
grant execute on function public.reset_progress() to authenticated;

comment on function public.reset_progress() is
  'Erases the caller''s learning history and restores the freeze inventory, keeping the account, profile, friendships, gifts and bookmarks.';

-- mutual_streaks: + out_friend_today --------------------------------------------
-- Return type gains a column, so the 0011 version must be dropped, not replaced.
-- Body is 0011's verbatim except for the added EXISTS over `theirs` (a friend's
-- goal-met/frozen days), evaluated at v_today.

drop function public.mutual_streaks(text);

create function public.mutual_streaks(p_tz text default 'UTC')
returns table (
  out_friend_id       uuid,
  out_streak          int,
  out_last_mutual_day date,
  out_friend_today    boolean
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
         (select max(i2.ends) from islands i2 where i2.fid = fr.fid),
         exists (select 1 from theirs t where t.fid = fr.fid and t.day = v_today)
  from friends fr;
end;
$$;

revoke execute on function public.mutual_streaks from public, anon;
grant execute on function public.mutual_streaks to authenticated;

comment on function public.mutual_streaks(text) is
  'Goal-gated mutual streak per accepted friend, plus whether that friend has hit their own goal today, bucketed in the caller''s timezone.';
