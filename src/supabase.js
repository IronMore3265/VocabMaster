import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — set them in .env',
  );
}

// A harmless placeholder keeps createClient from throwing when env is missing;
// calls then fail at the network layer (caught by callers) instead of at import,
// so the app still boots to onboarding / sign-in.
const url = supabaseUrl || 'https://placeholder.supabase.co';
const key = supabaseKey || 'placeholder-anon-key';

// Web WebView build: localStorage persistence, and detectSessionInUrl off since
// there is no magic-link redirect flow here (email + password only).
export const supabase = createClient(url, key, {
  auth: {
    storage: window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
