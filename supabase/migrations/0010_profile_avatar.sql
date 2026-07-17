-- Avatar: a key into the SVG set in src/avatars.js — not an upload, not a URL.
-- Nothing is stored but the choice, so there is no bucket, no MIME check and no
-- cleanup on account delete.
--
-- text + a regex rather than an enum: the set of valid keys lives in the client,
-- and an enum would make every new avatar a migration that has to land before
-- the deploy that uses it. The check is only a sanity bound — it keeps blobs and
-- markup out, it does not claim to know which keys exist. avatarSvg() does that,
-- and returns '' for a key it does not recognise.
--
-- Nullable, no default and no backfill: null means "hasn't picked one", the case
-- friends.js already falls back to an initial letter for. Defaulting to a real
-- key would make every existing user look like they chose the same avatar.
--
-- No policy work needed. "Own or friend profile read" (0007) and "Own profile
-- update" (0002) are both table-level with no column list, and RLS is row-level
-- only, so a new column is covered by both as-is.

alter table public.profiles
  add column avatar text
    constraint profiles_avatar_key check (avatar is null or avatar ~ '^[a-z0-9_-]{1,16}$');

comment on column public.profiles.avatar is
  'Avatar id from the client-side SVG set (src/avatars.js); null = not chosen.';
