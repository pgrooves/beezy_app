// delete-account — in-app account deletion (guideline 5.1.1(v), Play's
// account-deletion policy). See docs/DECISIONS.md#0022.
//
// The caller can only ever delete themselves: the user id comes from their
// own verified access token, never from the request body. The service role
// then deletes the auth user, and the database does the rest —
// profiles cascade from auth.users, vehicles from profiles.
//
// When bookings and payments arrive they must be anonymised, not deleted
// (Beezy has tax obligations on work that happened). That step belongs here,
// before the delete, in the same migration that adds those tables.
//
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected
// by the platform. The service role key never leaves this function.

import { createClient } from 'npm:@supabase/supabase-js@2';

// Bearer-token auth with no cookies, so a wildcard origin grants nothing a
// stolen token would not already grant. The real gate is the token.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' });

  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json(401, { error: 'Sign in again, then retry.' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Resolve the caller from their own token. getUser() asks Auth to validate
  // it, so an expired or forged token fails here.
  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await asCaller.auth.getUser();
  if (userError || !userData.user) return json(401, { error: 'Sign in again, then retry.' });
  const userId = userData.user.id;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // The owner is the business. Deleting that account from a phone would
  // lock Beezy out of its own portal with nobody able to restore access, so
  // the app refuses and says why. Ownership moves first, deliberately.
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) return json(500, { error: 'Your account wasn’t deleted. Try again in a moment.' });
  if (profile?.role === 'owner') {
    return json(409, {
      error: 'This is the owner account. Transfer ownership to someone else before deleting it.',
    });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error('delete-account: deleteUser failed', userId, deleteError.message);
    return json(500, { error: 'Your account wasn’t deleted. Try again in a moment.' });
  }

  // An id and nothing else: enough to answer "was this request honoured?".
  console.log('delete-account: deleted', userId);
  return json(200, { deleted: true });
});
