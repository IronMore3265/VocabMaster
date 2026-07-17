-- Mutual friend streak: consecutive days on which BOTH members of a friend pair
-- practised. Set-returning over every accepted friend at once, because the
-- Friends tab renders a list and one RPC per row would be a round trip per row.
--
-- Two departures from friend_stats() in 0007, both deliberate:
--
--   * The friendship guard is structural rather than a check. friend_stats()
--     takes a friend id and must prove the caller is entitled to it. Here the
--     only source of friend ids is the caller's own accepted friendships, so
--     there is no id to smuggle in. The auth.uid() null check is kept.
--
--   * Days are bucketed in the CALLER's timezone, not UTC. computeStreak() in
--     src/api/queries.js buckets in the device's zone, and this streak is shown
--     beside that one, so the two have to agree. An IANA name rather than an
--     offset: an offset applied to historical rows mis-buckets everything on the
--     far side of a DST change.
--
-- Consequence of using the caller's zone: two friends in different zones may see
-- the same pair's streak differ by a day. That is correct — a streak is measured
-- in the local days of whoever is looking at it.

create function public.mutual_streaks(p_tz text default 'UTC')
returns table (
  out_friend_id       uuid,
  out_streak          int,
  out_last_mutual_day date
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  -- `at time zone` raises 22023 on an unknown name and this value arrives from
  -- the browser, so an unrecognised zone degrades to UTC rather than erroring.
  v_tz    text := coalesce(nullif(trim(p_tz), ''), 'UTC');
  v_today date;
begin
  if v_user is null then
    raise exception 'mutual_streaks: not authenticated';
  end if;
  if not exists (select 1 from pg_timezone_names where name = v_tz) then
    v_tz := 'UTC';
  end if;
  v_today := (now() at time zone v_tz)::date;

  return query
  with friends as (
    -- The guard. Nothing else in this query names a user id.
    select f.friend_id as fid from public.friendships f
    where f.user_id = v_user and f.status = 'accepted'
  ),
  -- 400 days bounds the scan; no streak in this app outlives it.
  mine as (
    select distinct (a.created_at at time zone v_tz)::date as day
    from public.attempts a
    where a.user_id = v_user
      and a.created_at >= now() - interval '400 days'
  ),
  theirs as (
    select distinct fr.fid, (a.created_at at time zone v_tz)::date as day
    from friends fr
    join public.attempts a on a.user_id = fr.fid
    where a.created_at >= now() - interval '400 days'
  ),
  -- A mutual day is one you both practised on: the intersection.
  both_days as (
    select t.fid, t.day
    from theirs t
    join mine m on m.day = t.day
  ),
  -- Gaps and islands, per friend: consecutive days share (day - row_number()).
  runs as (
    select b.fid,
           b.day,
           b.day - (row_number() over (partition by b.fid order by b.day))::int as grp
    from both_days b
  ),
  islands as (
    select r.fid, count(*)::int as len, max(r.day) as ends
    from runs r
    group by r.fid, r.grp
  )
  -- Driven off `friends` so a friend you have never practised alongside still
  -- returns a row, and the client can render 0 without a missing key.
  select fr.fid,
         coalesce((
           select i.len from islands i
           where i.fid = fr.fid
             -- The streak survives until midnight: a run that ended yesterday is
             -- still alive if today has no practice yet. Same rule as
             -- computeStreak() and friend_stats().
             and i.ends >= v_today - 1
           order by i.ends desc limit 1
         ), 0),
         (select max(i2.ends) from islands i2 where i2.fid = fr.fid)
  from friends fr;
end;
$$;

revoke execute on function public.mutual_streaks from public, anon;
grant execute on function public.mutual_streaks to authenticated;

comment on function public.mutual_streaks(text) is
  'Consecutive days both the caller and each accepted friend practised, bucketed in the caller''s timezone.';

-- friend_stats: bucket in the caller's timezone too ----------------------------
-- 0007 computed out_streak in UTC while the client computed the user's own
-- streak device-local, so the compare sheet has been showing a local number
-- against a UTC one. Same p_tz treatment, so both sides of that sheet agree.
--
-- The drop is mandatory: `create or replace` with an added default argument
-- creates an overload rather than replacing, and friend_stats(p_friend_id => x)
-- then fails to resolve as ambiguous.

drop function public.friend_stats(uuid);

create function public.friend_stats(p_friend_id uuid, p_tz text default 'UTC')
returns table (
  out_friend_id    uuid,
  out_display_name text,
  out_attempts     bigint,
  out_accuracy     numeric,
  out_mastered     bigint,
  out_streak       int,
  out_last_active  timestamptz
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_tz   text := coalesce(nullif(trim(p_tz), ''), 'UTC');
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

  return query
  with a as (
    select count(*) as n,
           avg(is_correct::int)::numeric(4, 3) as acc,
           max(created_at) as last_at
    from public.attempts where user_id = p_friend_id
  ),
  m as (
    select count(*) as n from public.word_progress
    where user_id = p_friend_id and mastery >= 4
  ),
  -- Consecutive practice days ending today or yesterday, mirroring
  -- computeStreak() in src/api/queries.js (a streak survives until midnight).
  d as (
    select distinct (created_at at time zone v_tz)::date as day
    from public.attempts where user_id = p_friend_id
  ),
  runs as (
    select day, (day - (row_number() over (order by day))::int) as grp from d
  ),
  best as (
    select count(*)::int as len, max(day) as ends
    from runs group by grp
  )
  select p_friend_id,
         p.display_name,
         coalesce(a.n, 0),
         coalesce(a.acc, 0),
         coalesce(m.n, 0),
         coalesce((
           select b.len from best b
           where b.ends >= (now() at time zone v_tz)::date - 1
           order by b.ends desc limit 1
         ), 0),
         a.last_at
  from public.profiles p, a, m
  where p.id = p_friend_id;
end;
$$;

revoke execute on function public.friend_stats from public, anon;
grant execute on function public.friend_stats to authenticated;
