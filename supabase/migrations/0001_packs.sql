-- Packs: fixed 20-word chunks per book, derived once from the alphabetical
-- word order (id order). Last pack of each book may hold fewer than 20 words;
-- books are never mixed. Expected result: book 1 -> 42 packs, book 2 -> 43.

create table public.packs (
  id          bigint generated always as identity primary key,
  book        int  not null check (book in (1, 2)),
  pack_number int  not null,
  first_word  text not null,
  last_word   text not null,
  word_count  int  not null,
  unique (book, pack_number)
);

alter table public.words add column pack_id bigint references public.packs (id);

with numbered as (
  select id, word, book,
         ceil((row_number() over (partition by book order by id))::numeric / 20)::int as pn
  from public.words
),
grouped as (
  select book, pn,
         (array_agg(word order by id))[1] as first_word,
         (array_agg(word order by id))[count(*)::int] as last_word,
         count(*)::int as word_count
  from numbered
  group by book, pn
),
ins as (
  insert into public.packs (book, pack_number, first_word, last_word, word_count)
  select book, pn, first_word, last_word, word_count
  from grouped
  order by book, pn
  returning id, book, pack_number
)
update public.words w
set pack_id = ins.id
from numbered n
join ins on ins.book = n.book and ins.pack_number = n.pn
where w.id = n.id;

alter table public.words alter column pack_id set not null;
create index words_pack_id_idx on public.words (pack_id);

alter table public.packs enable row level security;

create policy "Authenticated read" on public.packs
  for select to authenticated using (true);

-- Tighten words to authenticated-only (the app requires sign-in).
drop policy if exists "Public read access" on public.words;
create policy "Authenticated read" on public.words
  for select to authenticated using (true);
