import { createClient } from '@supabase/supabase-js';

/**
 * Supabase browser client.
 *
 * The repo is public, so this bundle is readable by anyone. The anon key is
 * safe to ship ONLY because row-level security does the real enforcement —
 * treat every RLS policy as public-facing security, not a convenience. Any
 * secret (Square, Google, Resend) lives in an edge function and never here.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. See docs/TESTING.md.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // The OAuth redirect lands back on a URL with the session in the hash.
    detectSessionInUrl: true,
  },
});
