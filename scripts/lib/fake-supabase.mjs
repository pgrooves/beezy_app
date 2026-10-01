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

// ---------------------------------------------------------------------------
// Rows the stub serves. Shaped exactly as PostgREST returns them.
// ---------------------------------------------------------------------------

const day = 86_400_000;
const at = (days, hour) => {
  const d = new Date(Date.now() + days * day);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const TOUR_IDS = {
  macan: '10000000-0000-4000-8000-000000000001',
  tahoe: '10000000-0000-4000-8000-000000000002',
  upcoming: '20000000-0000-4000-8000-000000000001',
  past: '20000000-0000-4000-8000-000000000002',
  request: '20000000-0000-4000-8000-000000000003',
};

const service = (id, slug, name, price, minutes, addon, premium, image, includes) => ({
  id, slug, name, summary: `${name} — the tour's copy.`, base_price_cents: price,
  base_duration_minutes: minutes, is_addon: addon, is_premium: premium,
  image_path: image, includes,
});

const SERVICES = [
  service('30000000-0000-4000-8000-000000000001', 'express-wash', 'Express Wash', 10000, 120, false, false, 'brand/photos/foam-windshield.webp', ['Hand wash, dried by hand', 'Interior vacuum']),
  service('30000000-0000-4000-8000-000000000002', 'luxe-wash', 'Luxe Wash', 14000, 180, false, false, 'brand/photos/wheel-detail.webp', ['Everything in the Express Wash', 'Exterior spray wax']),
  service('30000000-0000-4000-8000-000000000003', 'beezy-wash', 'Beezy Wash', 20000, 270, false, false, 'brand/photos/owner-portrait.webp', ['Full interior detail']),
  service('30000000-0000-4000-8000-000000000004', 'clay-bar', 'Clay Bar', 39900, 360, true, false, null, ['Removes embedded contaminants']),
  service('30000000-0000-4000-8000-000000000006', 'ceramic-coating', 'Ceramic Coating', 87900, 600, true, true, null, ['Long-term gloss']),
];

function vehiclesFor(ownerId) {
  return [
    { id: TOUR_IDS.macan, owner_id: ownerId, year: 2023, make: 'Porsche', model: 'Macan', colour: 'Carrara White', body_type: 'mid_suv', third_row: false, vin: null, plate: 'NOLA 22', notes: null, coating_applied_at: at(-120, 9), coating_warranty_expires_at: at(610, 9) },
    { id: TOUR_IDS.tahoe, owner_id: ownerId, year: 2021, make: 'Chevrolet', model: 'Tahoe', colour: 'Black', body_type: 'large_suv', third_row: true, vin: null, plate: null, notes: 'Dog hair in the third row.', coating_applied_at: null, coating_warranty_expires_at: null },
  ];
}

function booking(id, clientId, vehicleId, label, serviceId, days, hour, status, cents) {
  return {
    id, client_id: clientId, vehicle_id: vehicleId, vehicle_label: label, service_ids: [serviceId],
    condition: 'moderate', surcharges: [], address_line1: '1428 Napoleon Ave', address_line2: null,
    city: 'New Orleans', state: 'LA', postal_code: '70115', gate_code: '4410', parking_notes: 'Driveway on the right.',
    covered: false, latitude: 29.9269, longitude: -90.1036, scheduled_at: at(days, hour), duration_minutes: 210,
    status, subtotal_cents: cents, deposit_cents: Math.round(cents * 0.2), quote_lines: [], needs_review: false,
    final_cents: status === 'paid' ? cents : null, notes: null, created_at: at(-3, 9),
  };
}

function bookingsFor(clientId) {
  return [
    booking(TOUR_IDS.upcoming, clientId, TOUR_IDS.macan, '2023 Porsche Macan', SERVICES[1].id, 3, 9, 'confirmed', 18500),
    booking(TOUR_IDS.past, clientId, TOUR_IDS.tahoe, '2021 Chevrolet Tahoe', SERVICES[2].id, -26, 10, 'paid', 42500),
  ];
}

function requestsForStaff() {
  return [
    { ...booking(TOUR_IDS.request, 'c1', null, '2022 Ford F-150', SERVICES[0].id, 2, 12, 'requested', 13800), client: { full_name: 'Marcus Boudreaux', phone: '5045550142', email: 'marcus@example.com' } },
    { ...booking(TOUR_IDS.upcoming, 'c2', null, '2023 Porsche Macan', SERVICES[1].id, 3, 9, 'confirmed', 18500), client: { full_name: 'Danielle Fontenot', phone: '', email: 'dani@example.com' } },
  ];
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
    const method = request.method();
    const json = (status, body) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    // PostgREST returns an object for .single()/.maybeSingle() (vnd.pgrst.object)
    // and an array otherwise; answer in whichever shape was asked for.
    const wantsObject = (request.headers()['accept'] ?? '').includes('vnd.pgrst.object');
    const rows = (list) => json(200, wantsObject ? list[0] ?? null : list);
    const body = () => {
      try {
        return request.postDataJSON();
      } catch {
        return {};
      }
    };

    if (method === 'OPTIONS') return route.fulfill({ status: 204 });

    if (url.pathname === '/auth/v1/user' && user) return json(200, sessionFor(user).user);
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 });

    // The menu is public.
    if (url.pathname === '/rest/v1/services' && method === 'GET') return rows(SERVICES);

    if (profileRow) {
      if (url.pathname === '/rest/v1/profiles') return rows([profileRow]);

      if (url.pathname === '/rest/v1/vehicles') {
        if (method === 'GET') return rows(vehiclesFor(user.id));
        if (method === 'DELETE') return route.fulfill({ status: 204 });
        // Insert or update: echo what was sent, as the database would.
        return json(201, { ...vehiclesFor(user.id)[0], id: TOUR_IDS.macan, ...body() });
      }

      if (url.pathname === '/rest/v1/bookings') {
        const staffQuery = (url.searchParams.get('select') ?? '').includes('client:profiles');
        if (method === 'GET') return rows(staffQuery ? requestsForStaff() : bookingsFor(user.id));
        if (method === 'POST') {
          const sent = body();
          return json(201, { ...booking('20000000-0000-4000-8000-0000000000aa', user.id, sent.vehicle_id, '', SERVICES[0].id, 2, 9, 'requested', 0), ...sent, status: 'requested' });
        }
        if (method === 'PATCH') return json(200, { ...bookingsFor(user.id)[0], ...body() });
      }

      if (url.pathname === '/rest/v1/photos') {
        if (method === 'GET') return rows([]);
        return route.fulfill({ status: 201 });
      }
      if (url.pathname.startsWith('/storage/v1/object/sign/')) return json(200, []);
      if (url.pathname.startsWith('/storage/v1/object/photos/')) {
        return json(200, { Key: url.pathname.replace('/storage/v1/object/', '') });
      }
    }

    unexpected.push(`${method} ${url.pathname}`);
    return json(500, { message: 'not stubbed by scripts/lib/fake-supabase.mjs' });
  });

  return unexpected;
}
