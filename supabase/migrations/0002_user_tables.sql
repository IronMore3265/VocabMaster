-- Per-user progress backbone: profiles, attempt log (the table the AI reads),
-- per-word aggregates with light SRS, bookmarks, AI suggestion cache, and the
-- shared dictionary cache. All writes to progress go through record_attempt().

-- Profiles ------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Own profile read" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "Own profile update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Attempts (append-only event log) -------------------------------------------

create type public.exercise_type as enum
  ('flashcard', 'matching', 'fill_blank', 'syn_ant', 'ai_mixed');

create table public.attempts (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users on delete cascade,
  word_id       bigint not null references public.words,
  pack_id       bigint references public.packs,
  exercise_type public.exercise_type not null,
  is_correct    boolean not null,
  created_at    timestamptz not null default now()
);

create index attempts_user_created_idx on public.attempts (user_id, created_at desc);
create index attempts_user_word_idx on public.attempts (user_id, word_id);

alter table public.attempts enable row level security;

create policy "Own attempts read" on public.attempts
  for select to authenticated using (auth.uid() = user_id);
-- No insert policy: writes go through record_attempt() (security definer).

-- Word progress (aggregate + SRS) --------------------------------------------

create table public.word_progress (
  user_id       uuid   not null references auth.users on delete cascade,
  word_id       bigint not null references public.words,
  correct_count int not null default 0,
  wrong_count   int not null default 0,
  mastery       int not null default 0 check (mastery between 0 and 5),
  last_reviewed timestamptz,
  next_due      timestamptz,
  primary key (user_id, word_id)
);

alter table public.word_progress enable row level security;

create policy "Own progress read" on public.word_progress
  for select to authenticated using (auth.uid() = user_id);
-- No insert/update policies: writes go through record_attempt().

-- Atomic answer recording -----------------------------------------------------
-- Mastery: correct -> +1 (max 5), wrong -> -1 (min 0). Mastered = mastery >= 4.
-- SRS intervals by mastery level (1..5): 1/3/7/14/30 days.

create function public.record_attempt(
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
begin
  if v_user is null then
    raise exception 'record_attempt: not authenticated';
  end if;

  insert into public.attempts (user_id, word_id, pack_id, exercise_type, is_correct)
  values (v_user, p_word_id, p_pack_id, p_type, p_correct);

  insert into public.word_progress
    (user_id, word_id, correct_count, wrong_count, mastery, last_reviewed, next_due)
  values (
    v_user,
    p_word_id,
    (p_correct)::int,
    (not p_correct)::int,
    (p_correct)::int,
    now(),
    now() + make_interval(days => v_intervals[1])
  )
  on conflict (user_id, word_id) do update
  set correct_count = word_progress.correct_count + (p_correct)::int,
      wrong_count   = word_progress.wrong_count + (not p_correct)::int,
      mastery       = greatest(0, least(5, word_progress.mastery + case when p_correct then 1 else -1 end)),
      last_reviewed = now(),
      next_due      = now() + make_interval(
        days => v_intervals[least(5, greatest(1, word_progress.mastery + case when p_correct then 1 else -1 end))]
      );
end;
$$;

revoke execute on function public.record_attempt from public, anon;
grant execute on function public.record_attempt to authenticated;

-- Bookmarks -------------------------------------------------------------------

create table public.bookmarks (
  user_id    uuid not null references auth.users on delete cascade,
  word       text not null,
  payload    jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, word)
);

alter table public.bookmarks enable row level security;

create policy "Own bookmarks read" on public.bookmarks
  for select to authenticated using (auth.uid() = user_id);
create policy "Own bookmarks insert" on public.bookmarks
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Own bookmarks update" on public.bookmarks
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Own bookmarks delete" on public.bookmarks
  for delete to authenticated using (auth.uid() = user_id);

-- AI suggestions cache ----------------------------------------------------------

create table public.ai_suggestions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  payload      jsonb not null,
  status       text not null default 'ready' check (status in ('ready', 'completed')),
  score        numeric,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index ai_suggestions_user_idx on public.ai_suggestions (user_id, created_at desc);

alter table public.ai_suggestions enable row level security;

create policy "Own suggestions read" on public.ai_suggestions
  for select to authenticated using (auth.uid() = user_id);
create policy "Own suggestions insert" on public.ai_suggestions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Own suggestions update" on public.ai_suggestions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Dictionary cache (shared across users; written by the edge function) ---------

create table public.dictionary_cache (
  word       text primary key,
  payload    jsonb not null,
  fetched_at timestamptz not null default now()
);

alter table public.dictionary_cache enable row level security;

create policy "Authenticated read" on public.dictionary_cache
  for select to authenticated using (true);
-- No client write policies: the dictionary-lookup edge function writes with the service role.
