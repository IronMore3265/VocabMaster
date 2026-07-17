-- Friends: a shareable code per profile, mutual friendships, and a stats RPC.
--
-- This is the first cross-user read in the schema — every policy before it is
-- strictly `auth.uid() = user_id`. Two consequences drive the design:
--   * A code lookup cannot be a plain select: the caller is not allowed to see
--     the target's profile row yet. Hence add_friend_by_code() is security
--     definer, like record_attempt().
--   * The analytics views (pack_progress, exercise_accuracy, weak_words) hard-
--     code auth.uid(), so they cannot report on anyone else. friend_stats()
--     recomputes what it needs after checking the friendship.

-- Friend codes ----------------------------------------------------------------
-- 6 digits (1,000,000 codes) so random assignment stays collision-free at this
-- app's scale. char(6), never an integer: codes are zero-padded and "000042"
-- must survive a round trip.

alter table public.profiles add column friend_code char(6) unique;

create function public.generate_friend_code()
returns char(6)
language plpgsql
security definer set search_path = public
as $$
declare
  v_code char(6);
  v_try  int := 0;
begin
  loop
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from public.profiles where friend_code = v_code);
    v_try := v_try + 1;
    if v_try > 50 then
      raise exception 'generate_friend_code: no free code after % tries', v_try;
    end if;
  end loop;
  return v_code;
end;
$$;

revoke execute on function public.generate_friend_code from public, anon, authenticated;

-- Backfill existing profiles, then make the column mandatory.
do $$
declare r record;
begin
  for r in select id from public.profiles where friend_code is null loop
    update public.profiles set friend_code = public.generate_friend_code() where id = r.id;
  end loop;
end;
$$;

alter table public.profiles alter column friend_code set not null;

-- New users get a code at signup. Replaces the 0002 version of this trigger fn.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, friend_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    public.generate_friend_code()
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user from public, anon, authenticated;

-- Friendships -----------------------------------------------------------------
-- One row per direction, both written together by add_friend_by_code() /
-- accept_friend(), so either side can read the pair with a single index hit and
-- either side can delete the whole friendship.

create table public.friendships (
  user_id    uuid not null references auth.users on delete cascade,
  friend_id  uuid not null references auth.users on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  -- 'out' = this side sent the request, 'in' = this side received it. Lets the
  -- UI split requests without a second table.
  direction  text not null check (direction in ('out', 'in')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  constraint friendships_no_self check (user_id <> friend_id)
);

create index friendships_friend_idx on public.friendships (friend_id);

alter table public.friendships enable row level security;

-- Readable by either party; a user must see requests addressed to them.
create policy "Own friendships read" on public.friendships
  for select to authenticated using (auth.uid() in (user_id, friend_id));
-- No insert/update/delete policies: writes go through the RPCs below. A direct
-- delete would drop one direction and leave the other side pointing at someone
-- who no longer lists them, so removal has to be mutual (see remove_friend()).

-- Profile visibility ----------------------------------------------------------
-- Widen the 0002 "Own profile read" so accepted friends can resolve each
-- other's display_name — it is not reachable any other way, since a JWT is only
-- readable by its owner. Pending requests are included so an incoming request
-- can show who it is from.

drop policy "Own profile read" on public.profiles;

create policy "Own or friend profile read" on public.profiles
  for select to authenticated using (
    auth.uid() = id
    or exists (
      select 1 from public.friendships f
      where f.user_id = auth.uid() and f.friend_id = profiles.id
    )
  );

-- Add / accept / remove --------------------------------------------------------

create function public.add_friend_by_code(p_code text)
returns table (friend_id uuid, display_name text, status text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_target uuid;
  v_name   text;
  v_code   char(6) := trim(p_code);
begin
  if v_user is null then
    raise exception 'add_friend_by_code: not authenticated';
  end if;

  select p.id, p.display_name into v_target, v_name
  from public.profiles p where p.friend_code = v_code;

  if v_target is null then
    raise exception 'No one has the code %', v_code using errcode = 'no_data_found';
  end if;
  if v_target = v_user then
    raise exception 'That is your own code' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.friendships f
    where f.user_id = v_user and f.friend_id = v_target
  ) then
    raise exception 'You are already connected to that person' using errcode = 'unique_violation';
  end if;

  -- Both directions up front so either side can read the pair.
  insert into public.friendships (user_id, friend_id, status, direction)
  values (v_user, v_target, 'pending', 'out'),
         (v_target, v_user, 'pending', 'in');

  return query select v_target, v_name, 'pending'::text;
end;
$$;

revoke execute on function public.add_friend_by_code from public, anon;
grant execute on function public.add_friend_by_code to authenticated;

create function public.accept_friend(p_friend_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'accept_friend: not authenticated';
  end if;
  -- Only the receiving side may accept, so a sender cannot self-approve.
  if not exists (
    select 1 from public.friendships f
    where f.user_id = v_user and f.friend_id = p_friend_id
      and f.direction = 'in' and f.status = 'pending'
  ) then
    raise exception 'No pending request from that user';
  end if;

  update public.friendships
  set status = 'accepted'
  where (user_id = v_user and friend_id = p_friend_id)
     or (user_id = p_friend_id and friend_id = v_user);
end;
$$;

revoke execute on function public.accept_friend from public, anon;
grant execute on function public.accept_friend to authenticated;

create function public.remove_friend(p_friend_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'remove_friend: not authenticated';
  end if;
  -- Removing is mutual: a one-sided delete would leave the other party with a
  -- friend row pointing at someone who no longer lists them.
  delete from public.friendships
  where (user_id = v_user and friend_id = p_friend_id)
     or (user_id = p_friend_id and friend_id = v_user);
end;
$$;

revoke execute on function public.remove_friend from public, anon;
grant execute on function public.remove_friend to authenticated;

-- Friend stats -----------------------------------------------------------------
-- Security definer because it reads another user's attempts/word_progress, which
-- RLS otherwise hides. It must therefore verify the friendship itself — that
-- check is the only thing standing between a caller and any user's history.

-- OUT params are deliberately prefixed: plpgsql substitutes bare identifiers, so
-- an OUT param named `attempts` would shadow the attempts table inside the body.
create function public.friend_stats(p_friend_id uuid)
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
    select distinct (created_at at time zone 'utc')::date as day
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
           where b.ends >= (now() at time zone 'utc')::date - 1
           order by b.ends desc limit 1
         ), 0),
         a.last_at
  from public.profiles p, a, m
  where p.id = p_friend_id;
end;
$$;

revoke execute on function public.friend_stats from public, anon;
grant execute on function public.friend_stats to authenticated;
