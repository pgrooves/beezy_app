import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { platform } from './platform';

/**
 * Supabase browser client.
 *
 * The repo is public, so this bundle is readable by anyone. The anon key is
 * safe to ship ONLY because row-level security does the real enforcement —
 * treat every RLS policy as public-facing security, not a convenience. Any
 * secret (Square, Google, Resend) lives in an edge function and never here.
 *
 * `null` when the build was made without configuration. That used to throw at
 * import, which took the whole app down — gallery, menu, About — over a
 * missing sign-in. Now the public screens still render and sign-in says it is
 * unavailable. CI refuses to build without the values (deploy.yml), so a null
 * client never reaches a tester; this is for local builds without a `.env`.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Sign-in is by emailed code, never by link (DECISIONS.md#0021), so
          // there is no session in the URL to pick up.
          detectSessionInUrl: false,
          // The session persists through the platform adapter rather than
          // supabase-js reaching for localStorage itself, so the native build
          // swaps in secure storage without this file changing.
          storage: {
            getItem: (key) => platform.storage.get(key),
            setItem: (key, value) => platform.storage.set(key, value),
            removeItem: (key) => platform.storage.remove(key),
          },
        },
      })
    : null;
