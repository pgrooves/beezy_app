// delete-account — in-app account deletion (guideline 5.1.1(v), Play's
// account-deletion policy). See docs/DECISIONS.md#0022.
//
// The caller can only ever delete themselves: the user id comes from their
// own verified access token, never from the request body. In order:
//
//   1. Bookings: work that happened (complete, paid) is kept for the tax
//      record with the person removed; everything else is deleted. The
//      database trigger from 0005 does the same on any profile delete; doing
//      it here too means in-app deletion is correct whether or not that
//      trigger is installed, and the two are idempotent together.
//   2. Photo files under <user id>/ in the `photos` bucket. Storage objects
//      do not cascade from rows, so they are removed explicitly.
//   3. The auth user. Profiles cascade from it; vehicles and photo rows
//      cascade from the profile.
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

  // 1. Bookings.
  const anonymised = await admin
    .from('bookings')
    .update({
      client_id: null,
      vehicle_id: null,
      vehicle_label: 'Vehicle',
      address_line1: null,
      address_line2: null,
      gate_code: null,
      parking_notes: null,
      latitude: null,
      longitude: null,
      notes: null,
      anonymised_at: new Date().toISOString(),
    })
    .eq('client_id', userId)
    .in('status', ['complete', 'paid']);
  const removedBookings = anonymised.error
    ? anonymised
    : await admin
        .from('bookings')
        .delete()
        .eq('client_id', userId)
        .not('status', 'in', '(complete,paid)');
  if (anonymised.error || removedBookings.error) {
    console.error('delete-account: bookings step failed', userId);
    return json(500, { error: 'Your account wasn’t deleted. Try again in a moment.' });
  }

  // 2. Photo files. Layout is <user>/<booking>/<file>; two levels to walk.
  const bucket = admin.storage.from('photos');
  const { data: folders } = await bucket.list(userId, { limit: 1000 });
  const paths: string[] = [];
  for (const folder of folders ?? []) {
    const { data: files } = await bucket.list(`${userId}/${folder.name}`, { limit: 1000 });
    for (const file of files ?? []) paths.push(`${userId}/${folder.name}/${file.name}`);
    // A file directly under the user folder has an id; a folder does not.
    if (folder.id) paths.push(`${userId}/${folder.name}`);
  }
  if (paths.length) {
    const { error: storageError } = await bucket.remove(paths);
    if (storageError) {
      console.error('delete-account: storage cleanup failed', userId);
      return json(500, { error: 'Your account wasn’t deleted. Try again in a moment.' });
    }
  }

  // 3. The account itself.
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error('delete-account: deleteUser failed', userId, deleteError.message);
    return json(500, { error: 'Your account wasn’t deleted. Try again in a moment.' });
  }

  // An id and nothing else: enough to answer "was this request honoured?".
  console.log('delete-account: deleted', userId);
  return json(200, { deleted: true });
});
