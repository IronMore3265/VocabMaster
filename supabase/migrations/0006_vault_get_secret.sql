-- Service-role-only accessor for Vault secrets (GEMINI_API_KEY, MW_API_KEY,
-- MW_THESAURUS_KEY — created via vault.create_secret, not in migrations).
-- Edge functions call this via their service-role client; app roles get no access.
create function public.get_secret(secret_name text)
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = secret_name;
$$;

revoke execute on function public.get_secret from public, anon, authenticated;
grant execute on function public.get_secret to service_role;
