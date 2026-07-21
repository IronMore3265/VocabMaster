-- Nudge a friend to finish their daily goal.
--
-- Duolingo-style: a one-tap "hey, keep your streak going" you send to an accepted
-- friend who hasn't hit today's goal yet. Delivery is in-app only (no push) — the
-- recipient's Realtime subscription raises a local heads-up when their app is open,
-- exactly like a freeze gift (see 0012_gift_streak_freeze.sql, the template for this).
--
-- Like every cross-user write in this app, the actual insert goes through a
-- security-definer RPC that verifies the friendship itself; RLS never lets one user
-- write another's rows directly.

-- One row per nudge, for the once-per-day-per-friend cooldown and the recipient's
-- live notification (Realtime).
create table if not exists public.nudges (
  sender_id    uuid not null references auth.users on delete cascade,
  recipient_id uuid not null references auth.users on delete cascade,
  created_at   timestamptz not null default now()
);
create index if not exists nudges_pair_idx
  on public.nudges (sender_id, recipient_id, created_at desc);
create index if not exists nudges_recipient_idx
  on public.nudges (recipient_id, created_at desc);

alter table public.nudges enable row level security;
-- Either party may read the nudge (the recipient's Realtime subscription needs this);
-- all writes go through nudge_friend below, never directly.
create policy "Own nudges read" on public.nudges
  for select to authenticated using (auth.uid() in (sender_id, recipient_id));

-- Send one nudge to an accepted friend. Verifies the friendship and enforces a
-- once-per-calendar-day-per-friend cooldown so a friend can be reminded daily but
-- not spammed. The day boundary is the sender's, passed as p_tz (device timezone),
-- matching how streaks are bucketed elsewhere.
create function public.nudge_friend(p_friend_id uuid, p_tz text default 'UTC')
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_last timestamptz;
begin
  if v_user is null then
    raise exception 'nudge_friend: not authenticated';
  end if;
  if v_user = p_friend_id then
    raise exception 'You can''t nudge yourself';
  end if;
  if not exists (
    select 1 from public.friendships f
    where f.user_id = v_user and f.friend_id = p_friend_id and f.status = 'accepted'
  ) then
    raise exception 'Not connected to that user';
  end if;

  -- One nudge per calendar day (sender's zone), per (sender, recipient) pair.
  select max(created_at) into v_last
  from public.nudges
  where sender_id = v_user and recipient_id = p_friend_id;
  if v_last is not null
     and (v_last at time zone p_tz)::date = (now() at time zone p_tz)::date then
    raise exception 'You already nudged them today. Try again tomorrow.';
  end if;

  insert into public.nudges (sender_id, recipient_id)
  values (v_user, p_friend_id);
end;
$$;

revoke execute on function public.nudge_friend from public, anon;
grant execute on function public.nudge_friend to authenticated;

-- Realtime: the recipient subscribes to nudges rows addressed to them, so a nudge
-- shows up (and earns a local notification) the moment a friend sends it. RLS still
-- applies to the stream, so only sender/recipient ever receive a row.
alter publication supabase_realtime add table public.nudges;
