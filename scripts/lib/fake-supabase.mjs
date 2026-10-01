/**
 * A signed-in session for the screenshot harnesses, with no backend.
 *
 * Seeds the session supabase-js would have stored after a real sign-in, and
 * answers the app's Supabase requests from the page itself, so the tour can
 * walk the account-bound and staff screens as a given role. Nothing reaches
 * the network: every request to the project host is fulfilled here, and an
 * unexpected one fails the screen loudly rather than going out.
 *
 * Build the app with any non-empty VITE_SUPABASE_ANON_KEY for this; the key
 * is never sent anywhere real.
 */

export const TOUR_SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || 'https://bdbarnvjktpfdogcfjvx.supabase.co';

const ref = new URL(TOUR_SUPABASE_URL).hostname.split('.')[0];
/** supabase-js's default storage key for this project. */
const STORAGE_KEY = `sb-${ref}-auth-token`;

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

function fakeUser(role) {
  const id = `00000000-0000-4000-8000-0000000000${role === 'owner' ? '0c' : role === 'tech' ? '0b' : '0a'}`;
  const email = `${role}@tour.test`;
  const fullName = { customer: 'Marcus Boudreaux', owner: 'Brandon', tech: 'Andre' }[role] ?? role;
  return { id, email, fullName };
}

function sessionFor(user) {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  // Shaped like a JWT because supabase-js decodes the payload in places. The
  // signature is meaningless; nothing that would check it is ever reached.
  const accessToken = [
    b64url({ alg: 'HS256', typ: 'JWT' }),
    b64url({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp: expiresAt }),
    'tour',
  ].join('.');
  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expiresAt,
    refresh_token: 'tour-refresh',
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      app_metadata: { provider: 'email' },
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
}

/**
 * Sign the page in as `role` ('customer' | 'owner' | 'tech'), or pass null to
 * browse signed out. Call before the first navigation.
 *
 * Returns a list that collects any Supabase request the stub did not expect.
 */
export async function useFakeSupabase(page, role) {
  const unexpected = [];
  const user = role ? fakeUser(role) : null;

  if (user) {
    const session = sessionFor(user);
    await page.addInitScript(
      ([key, value]) => {
        try {
          window.localStorage.setItem(key, value);
        } catch {
          /* ignore */
        }
      },
      [STORAGE_KEY, JSON.stringify(session)],
    );
  }

  const profileRow = user && {
    id: user.id,
    role,
    email: user.email,
    full_name: user.fullName,
    phone: '5045550142',
    gallery_consent: false,
  };

  await page.route(`${TOUR_SUPABASE_URL}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (status, body) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 });

    if (url.pathname === '/rest/v1/profiles' && profileRow) {
      // PostgREST returns an object for .single() (vnd.pgrst.object) and an
      // array otherwise; answer in whichever shape was asked for.
      const wantsObject = (request.headers()['accept'] ?? '').includes('vnd.pgrst.object');
      return json(200, wantsObject ? profileRow : [profileRow]);
    }
    if (url.pathname === '/auth/v1/user' && user) return json(200, sessionFor(user).user);
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });

    unexpected.push(`${request.method()} ${url.pathname}`);
    return json(500, { message: 'not stubbed by scripts/lib/fake-supabase.mjs' });
  });

  return unexpected;
}
