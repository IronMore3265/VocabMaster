-- Gift a streak freeze to a friend.
--
-- Friends can already add/accept/remove each other; this lets you *help* a friend
-- protect their streak by giving them one streak freeze. Duolingo-style, the gift is
-- rate-limited to once per two weeks per friend, and only lands when the recipient is
-- below the hold cap of 2 (see profiles.streak_freezes check in 0011).
--
-- Like every cross-user write in this app, the actual change goes through a
-- security-definer RPC that verifies the friendship itself — RLS hides other users'
-- profiles, so a friend can never touch another's streak_freezes directly.

-- Gift log: one row per gift, for the 14-day-per-pair cooldown and the recipient's
-- live "someone gave you a freeze" notification (Realtime).
create table if not exists public.freeze_gifts (
  sender_id    uuid not null references auth.users on delete cascade,
  recipient_id uuid not null references auth.users on delete cascade,
  created_at   timestamptz not null default now()
);
create index if not exists freeze_gifts_pair_idx
  on public.freeze_gifts (sender_id, recipient_id, created_at desc);
create index if not exists freeze_gifts_recipient_idx
  on public.freeze_gifts (recipient_id, created_at desc);

alter table public.freeze_gifts enable row level security;
-- Either party may read the gift (recipient's Realtime subscription needs this); all
-- writes go through gift_streak_freeze below, never directly.
create policy "Own freeze gifts read" on public.freeze_gifts
  for select to authenticated using (auth.uid() in (sender_id, recipient_id));

-- Each accepted friend's current freeze count, so the UI knows when to offer a gift.
-- Definer because profiles.streak_freezes of another user is hidden by RLS; it only
-- ever returns counts for the caller's *accepted* friends.
create function public.friend_freezes()
returns table (out_friend_id uuid, out_freezes int)
language sql
security definer set search_path = public
as $$
  select f.friend_id, p.streak_freezes
  from public.friendships f
  join public.profiles p on p.id = f.friend_id
  where f.user_id = auth.uid() and f.status = 'accepted';
$$;

revoke execute on function public.friend_freezes from public, anon;
grant execute on function public.friend_freezes to authenticated;

-- Give one streak freeze to an accepted friend. Verifies the friendship, enforces the
-- once-per-two-weeks-per-friend cooldown, and refuses when the friend is already full.
create function public.gift_streak_freeze(p_friend_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_freezes  int;
  v_last     timestamptz;
  v_days_ago int;
begin
  if v_user is null then
    raise exception 'gift_streak_freeze: not authenticated';
  end if;
  if not exists (
    select 1 from public.friendships f
    where f.user_id = v_user and f.friend_id = p_friend_id and f.status = 'accepted'
  ) then
    raise exception 'Not connected to that user';
  end if;

  select streak_freezes into v_freezes from public.profiles where id = p_friend_id;
  if v_freezes is null then
    raise exception 'Could not find that friend';
  end if;
  if v_freezes >= 2 then
    raise exception 'Their freezes are already full';
  end if;

  -- One gift per fortnight, per (sender, recipient) pair.
  select max(created_at) into v_last
  from public.freeze_gifts
  where sender_id = v_user and recipient_id = p_friend_id;
  if v_last is not null and v_last > now() - interval '14 days' then
    v_days_ago := ceil(extract(epoch from (v_last + interval '14 days' - now())) / 86400.0)::int;
    raise exception 'You already gave them a freeze recently. Try again in % day%',
      v_days_ago, case when v_days_ago = 1 then '' else 's' end;
  end if;

  update public.profiles
  set streak_freezes = least(2, streak_freezes + 1)
  where id = p_friend_id;

  insert into public.freeze_gifts (sender_id, recipient_id)
  values (v_user, p_friend_id);
end;
$$;

revoke execute on function public.gift_streak_freeze from public, anon;
grant execute on function public.gift_streak_freeze to authenticated;

-- Realtime: the recipient subscribes to freeze_gifts rows addressed to them, so a gift
-- shows up (and earns a local notification) the moment a friend sends it. RLS still
-- applies to the stream, so only sender/recipient ever receive a row.
alter publication supabase_realtime add table public.freeze_gifts;
