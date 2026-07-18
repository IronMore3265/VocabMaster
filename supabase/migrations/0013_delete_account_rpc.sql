-- Self-service account deletion via a SECURITY DEFINER RPC.
--
-- The delete-account edge function called admin.deleteUser() (GoTrue), which was
-- failing with an opaque 500 in production. Every table that references
-- auth.users already declares ON DELETE CASCADE (profiles, attempts,
-- word_progress, bookmarks, ai_suggestions, friendships, freeze_gifts,
-- streak_freeze_days, plus GoTrue's own auth.* tables), so a plain
--   delete from auth.users where id = auth.uid()
-- erases the user and every dependent row in one shot. Running it as
-- SECURITY DEFINER (owner: postgres) lets an authenticated caller delete only
-- their own row — auth.uid() still resolves from the request JWT under DEFINER.

create or replace function public.delete_current_user()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

-- Only a signed-in user may call it, and only ever for themselves (auth.uid()).
revoke all on function public.delete_current_user() from public, anon;
grant execute on function public.delete_current_user() to authenticated;
