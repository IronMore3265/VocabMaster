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

  // Service-role delete cascades to all public.* rows keyed on this user.
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { error } = await admin.auth.admin.deleteUser(userData.user.id);
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true });
});
