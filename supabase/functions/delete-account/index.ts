// Account deletion: identifies the caller from their JWT, then uses the service
// role to delete the auth user. Every per-user table (profiles, attempts,
// word_progress, bookmarks, ai_suggestions) references auth.users ON DELETE
// CASCADE, so removing the user removes all of their data in one shot.
// verify_jwt is on, so only a signed-in user can delete their own account.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Who is calling? Bind a client to the caller's JWT and read the user back.
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return json({ error: 'unauthorized' }, 401);

  // NOTE: the app now deletes accounts via the delete_current_user() RPC (see
  // migration 0013) rather than this function — admin.deleteUser() was failing
  // with an opaque 500. This is kept as a fallback and now logs/returns the real
  // error so any future failure is diagnosable instead of a bare "non-2xx".
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey) {
    console.error('delete-account: SUPABASE_SERVICE_ROLE_KEY is not set');
    return json({ error: 'server_misconfigured: service role key missing' }, 500);
  }

  // Service-role delete cascades to all public.* rows keyed on this user.
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
  const { error } = await admin.auth.admin.deleteUser(userData.user.id);
  if (error) {
    console.error('delete-account: deleteUser failed', error);
    return json({ error: error.message }, 500);
  }

  return json({ ok: true });
});
