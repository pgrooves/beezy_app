/**
 * Demo data for the shell.
 *
 * Shaped exactly like the Supabase schema, so swapping a fixture array for a
 * query is a one-line change per screen and no component needs touching.
 * Prices and copy are the real ones from beezynola.com.
 *
 * This also becomes the reviewer demo account required by guideline 2.1 — a
 * reviewer in Cupertino cannot book a real detail in New Orleans, and a review
 * that dead-ends at an empty state gets rejected as incomplete.
 */
import type {
  Booking,
  Client,
  Job,
  Payment,
  Photo,
  Plan,
  Service,
  Subscription,
  Vehicle,
} from './types';

/**
 * Asset paths are stored relative and resolved by the view layer via
 * src/lib/assets.ts. Reaching for `import.meta.env.BASE_URL` here would tie
 * the portable core to Vite; React Native has no such thing.
 */
const photo = (name: string) => `brand/photos/${name}`;

/** Dates are relative to load so the demo never looks stale. */
const day = 86_400_000;
const now = Date.now();
const at = (offsetDays: number, hour = 9, minute = 0) => {
  const d = new Date(now + offsetDays * day);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

// ---------------------------------------------------------------------------
// Services — the live menu
// ---------------------------------------------------------------------------

export const SERVICES: Service[] = [
  {
    id: 'svc-express',
    slug: 'express-wash',
    name: 'Express Wash',
    summary: 'The weekly reset. Clean inside and out, done in a couple of hours.',
    basePriceCents: 10000,
    baseDurationMinutes: 120,
    isAddon: false,
    isPremium: false,
    imageUrl: photo('foam-windshield.webp'),
    includes: [
      'Hand wash, dried by hand',
      'Rims cleaned, tires dressed',
      'Door jambs wiped',
      'All glass, inside and out',
      'Dash and console wiped',
      'Interior vacuum',
    ],
  },
  {
    id: 'svc-luxe',
    slug: 'luxe-wash',
    name: 'Luxe Wash',
    summary: 'Everything in the Express, plus protection on the paint and a proper interior blowout.',
    basePriceCents: 14000,
    baseDurationMinutes: 180,
    isAddon: false,
    isPremium: false,
    imageUrl: photo('wheel-detail.webp'),
    includes: [
      'Everything in the Express Wash',
      'Exterior spray wax',
      'Interior blowout of vents and seams',
      'Hard-to-reach areas detailed',
    ],
  },
  {
    id: 'svc-beezy',
    slug: 'beezy-wash',
    name: 'Beezy Wash',
    summary: 'The full treatment. Every surface in the car conditioned and protected.',
    basePriceCents: 20000,
    baseDurationMinutes: 270,
    isAddon: false,
    isPremium: false,
    imageUrl: photo('owner-portrait.webp'),
    includes: [
      'Everything in the Express and Luxe',
      'All plastic surfaces conditioned',
      'Leather cleaned and conditioned',
      'Full interior detail',
    ],
  },
  {
    id: 'svc-clay',
    slug: 'clay-bar',
    name: 'Clay Bar',
    summary: 'Pulls contaminants out of the paint so it feels like glass again.',
    basePriceCents: 39900,
    baseDurationMinutes: 360,
    isAddon: true,
    isPremium: false,
    imageUrl: photo('beezy-mobile-van.webp'),
    includes: [
      'Removes embedded contaminants',
      'Restores a smooth finish',
      'Preps the surface for wax or coating',
    ],
  },
  {
    id: 'svc-headlight',
    slug: 'headlight-restore',
    name: 'Headlight Restoration',
    summary: 'Removes the yellow haze so you actually see the road at night.',
    basePriceCents: 9900,
    baseDurationMinutes: 90,
    isAddon: true,
    isPremium: false,
    includes: ['Oxidation removed', 'Clarity restored', 'Sealed against re-yellowing'],
  },
  {
    id: 'svc-ceramic',
    slug: 'ceramic-coating',
    name: 'Ceramic Coating',
    summary: 'A polymer bonded to the paint. Years of gloss, and water that runs straight off.',
    basePriceCents: 87900,
    baseDurationMinutes: 600,
    isAddon: true,
    isPremium: true,
    imageUrl: photo('make-life-easy-card.webp'),
    includes: [
      'Liquid polymer bonded to the paint',
      'UV, dirt and water-spot protection',
      'Hydrophobic — water beads and runs',
      'Long-term gloss',
    ],
  },
];

export const serviceBySlug = (slug: string) => SERVICES.find((s) => s.slug === slug);
export const serviceById = (id: string) => SERVICES.find((s) => s.id === id);

// ---------------------------------------------------------------------------
// The signed-in demo customer
// ---------------------------------------------------------------------------

export const DEMO_CUSTOMER_ID = 'cli-001';

export const VEHICLES: Vehicle[] = [
  {
    id: 'veh-001',
    ownerId: DEMO_CUSTOMER_ID,
    year: 2023,
    make: 'Porsche',
    model: 'Macan',
    colour: 'Carrara White',
    bodyType: 'mid_suv',
    thirdRow: false,
    plate: 'NOLA 22',
    photoUrl: photo('wheel-detail.webp'),
    coatingAppliedAt: at(-120),
    coatingWarrantyExpiresAt: at(610),
    notes: 'Garage kept. Gate code on the keypad, not the callbox.',
  },
  {
    id: 'veh-002',
    ownerId: DEMO_CUSTOMER_ID,
    year: 2024,
    make: 'Chevrolet',
    model: 'Tahoe',
    colour: 'Black',
    bodyType: 'large_suv',
    thirdRow: true,
    plate: 'GEAUX 4',
    photoUrl: photo('foam-windshield.webp'),
    notes: 'Kids and a golden retriever. Third row folds down.',
  },
];

export const CLIENTS: Client[] = [
  {
    id: DEMO_CUSTOMER_ID,
    fullName: 'Marcus Boudreaux',
    email: 'marcus@example.com',
    phone: '(504) 555-0142',
    tags: ['vip', 'recurring'],
    since: at(-410),
    lifetimeValueCents: 428000,
    jobCount: 14,
    lastServiceAt: at(-26),
    avatarInitials: 'MB',
    notes: 'Prefers Saturday mornings. Always tips in cash.',
  },
  {
    id: 'cli-002',
    fullName: 'Simone Landry',
    email: 'simone@example.com',
    phone: '(504) 555-0188',
    tags: ['recurring'],
    since: at(-220),
    lifetimeValueCents: 186000,
    jobCount: 7,
    lastServiceAt: at(-12),
    avatarInitials: 'SL',
  },
  {
    id: 'cli-003',
    fullName: 'Delgado Fleet Services',
    email: 'ops@delgadofleet.example',
    phone: '(504) 555-0110',
    tags: ['fleet'],
    since: at(-300),
    lifetimeValueCents: 962000,
    jobCount: 31,
    lastServiceAt: at(-4),
    avatarInitials: 'DF',
    notes: 'Six vans. Invoice monthly, net 30.',
  },
  {
    id: 'cli-004',
    fullName: 'Tran Nguyen',
    email: 'tran@example.com',
    phone: '(504) 555-0173',
    tags: ['lapsed'],
    since: at(-520),
    lifetimeValueCents: 74000,
    jobCount: 3,
    lastServiceAt: at(-198),
    avatarInitials: 'TN',
  },
  {
    id: 'cli-005',
    fullName: 'Aisha Roberts',
    email: 'aisha@example.com',
    phone: '(504) 555-0155',
    tags: ['vip'],
    since: at(-95),
    lifetimeValueCents: 254000,
    jobCount: 5,
    lastServiceAt: at(-9),
    avatarInitials: 'AR',
  },
];

export const clientById = (id: string) => CLIENTS.find((c) => c.id === id);
export const vehicleById = (id: string) => VEHICLES.find((v) => v.id === id);

const uptownAddress = {
  line1: '1428 Napoleon Ave',
  city: 'New Orleans',
  state: 'LA',
  postalCode: '70115',
  covered: true,
  gateCode: '#4412',
  parkingNotes: 'Driveway on the right, behind the gate.',
};

// ---------------------------------------------------------------------------
// Bookings — a populated past and a real next appointment
// ---------------------------------------------------------------------------

export const BOOKINGS: Booking[] = [
  {
    id: 'bk-100',
    clientId: DEMO_CUSTOMER_ID,
    vehicleId: 'veh-001',
    serviceIds: ['svc-luxe'],
    condition: 'moderate',
    surcharges: [],
    address: uptownAddress,
    scheduledAt: at(3, 9),
    durationMinutes: 210,
    status: 'confirmed',
    depositCents: 4000,
    totalCents: 18500,
    createdAt: at(-2),
  },
  {
    id: 'bk-099',
    clientId: DEMO_CUSTOMER_ID,
    vehicleId: 'veh-002',
    serviceIds: ['svc-beezy'],
    condition: 'heavy',
    surcharges: ['pet_hair'],
    address: uptownAddress,
    scheduledAt: at(-26, 10),
    durationMinutes: 420,
    status: 'paid',
    depositCents: 8000,
    totalCents: 42500,
    finalCents: 42500,
    createdAt: at(-30),
  },
  {
    id: 'bk-098',
    clientId: DEMO_CUSTOMER_ID,
    vehicleId: 'veh-001',
    serviceIds: ['svc-express'],
    condition: 'light',
    surcharges: [],
    address: uptownAddress,
    scheduledAt: at(-54, 14),
    durationMinutes: 140,
    status: 'paid',
    depositCents: 2500,
    totalCents: 11500,
    finalCents: 11500,
    createdAt: at(-58),
  },
];

/** Beezy's day. Ordered as he'll actually drive it. */
export const TODAY_BOOKINGS: Booking[] = [
  {
    id: 'bk-201',
    clientId: 'cli-005',
    vehicleId: 'veh-201',
    serviceIds: ['svc-luxe'],
    condition: 'moderate',
    surcharges: [],
    address: { ...uptownAddress, line1: '820 Jackson Ave', postalCode: '70130' },
    scheduledAt: at(0, 8),
    durationMinutes: 195,
    status: 'complete',
    depositCents: 3500,
    totalCents: 17000,
    finalCents: 17000,
    createdAt: at(-6),
  },
  {
    id: 'bk-202',
    clientId: 'cli-002',
    vehicleId: 'veh-202',
    serviceIds: ['svc-express', 'svc-headlight'],
    condition: 'heavy',
    surcharges: [],
    address: { ...uptownAddress, line1: '3301 Magazine St', postalCode: '70115' },
    scheduledAt: at(0, 12, 30),
    durationMinutes: 225,
    status: 'in_progress',
    depositCents: 4500,
    totalCents: 22000,
    createdAt: at(-5),
  },
  {
    id: 'bk-203',
    clientId: 'cli-003',
    vehicleId: 'veh-203',
    serviceIds: ['svc-beezy'],
    condition: 'heavy',
    surcharges: ['gulf_sand'],
    address: { ...uptownAddress, line1: '5100 Tchoupitoulas St', postalCode: '70115', covered: false },
    scheduledAt: at(0, 16),
    durationMinutes: 300,
    status: 'confirmed',
    depositCents: 7000,
    totalCents: 34500,
    createdAt: at(-3),
  },
];

/** The pipeline board. */
export const PIPELINE_BOOKINGS: Booking[] = [
  ...TODAY_BOOKINGS,
  {
    id: 'bk-204',
    clientId: 'cli-004',
    vehicleId: 'veh-204',
    serviceIds: ['svc-express'],
    condition: 'moderate',
    surcharges: [],
    address: { ...uptownAddress, line1: '7200 St Charles Ave', postalCode: '70118' },
    scheduledAt: at(1, 9),
    durationMinutes: 150,
    status: 'requested',
    depositCents: 0,
    totalCents: 13000,
    createdAt: at(0, 7),
    // Arrived through the legacy Square page rather than the app, so it has no
    // vehicle detail or condition photos yet.
    squareBookingId: 'sq-bk-88213',
  },
  {
    id: 'bk-205',
    clientId: DEMO_CUSTOMER_ID,
    vehicleId: 'veh-001',
    serviceIds: ['svc-luxe'],
    condition: 'moderate',
    surcharges: [],
    address: uptownAddress,
    scheduledAt: at(3, 9),
    durationMinutes: 210,
    status: 'confirmed',
    depositCents: 4000,
    totalCents: 18500,
    createdAt: at(-2),
  },
  {
    id: 'bk-206',
    clientId: 'cli-005',
    vehicleId: 'veh-205',
    serviceIds: ['svc-ceramic'],
    condition: 'light',
    surcharges: [],
    address: { ...uptownAddress, line1: '1201 Broadway St', postalCode: '70118' },
    scheduledAt: at(-2, 8),
    durationMinutes: 600,
    status: 'paid',
    depositCents: 17500,
    totalCents: 87900,
    finalCents: 87900,
    createdAt: at(-9),
  },
];

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

const standardChecklist = (done: number) =>
  [
    { id: 'c1', label: 'Walk-around, before photos', requiresPhoto: true },
    { id: 'c2', label: 'Wheels and tires' },
    { id: 'c3', label: 'Hand wash and dry' },
    { id: 'c4', label: 'Door jambs' },
    { id: 'c5', label: 'Glass, inside and out' },
    { id: 'c6', label: 'Interior vacuum' },
    { id: 'c7', label: 'Dash and console' },
    { id: 'c8', label: 'Final walk-around, after photos', requiresPhoto: true },
  ].map((item, i) => ({ ...item, done: i < done }));

export const JOBS: Job[] = [
  {
    id: 'job-201',
    bookingId: 'bk-201',
    startedAt: at(0, 8),
    completedAt: at(0, 11, 15),
    checklist: standardChecklist(8),
    photoIds: ['ph-1', 'ph-2'],
  },
  {
    id: 'job-202',
    bookingId: 'bk-202',
    startedAt: at(0, 12, 30),
    checklist: standardChecklist(5),
    photoIds: ['ph-3'],
  },
  { id: 'job-203', bookingId: 'bk-203', checklist: standardChecklist(0), photoIds: [] },
];

export const jobForBooking = (bookingId: string) => JOBS.find((j) => j.bookingId === bookingId);

// ---------------------------------------------------------------------------
// Photos — the public gallery plus the customer's own sets
// ---------------------------------------------------------------------------

export const PHOTOS: Photo[] = [
  {
    id: 'ph-1',
    kind: 'before',
    pairKey: 'pair-a',
    url: photo('foam-windshield.webp'),
    capturedAt: at(-26, 10),
    serviceSlug: 'beezy-wash',
    published: true,
    bookingId: 'bk-099',
  },
  {
    id: 'ph-2',
    kind: 'after',
    pairKey: 'pair-a',
    url: photo('wheel-detail.webp'),
    capturedAt: at(-26, 16),
    serviceSlug: 'beezy-wash',
    published: true,
    bookingId: 'bk-099',
  },
  {
    id: 'ph-3',
    kind: 'before',
    pairKey: 'pair-b',
    url: photo('owner-portrait.webp'),
    capturedAt: at(-54, 14),
    serviceSlug: 'express-wash',
    published: true,
    bookingId: 'bk-098',
  },
  {
    id: 'ph-4',
    kind: 'after',
    pairKey: 'pair-b',
    url: photo('beezy-mobile-van.webp'),
    capturedAt: at(-54, 17),
    serviceSlug: 'express-wash',
    published: true,
    bookingId: 'bk-098',
  },
  {
    id: 'ph-5',
    kind: 'after',
    url: photo('make-life-easy-card.webp'),
    capturedAt: at(-70),
    serviceSlug: 'ceramic-coating',
    published: true,
  },
  {
    id: 'ph-6',
    kind: 'after',
    url: photo('wheel-detail.webp'),
    capturedAt: at(-88),
    serviceSlug: 'clay-bar',
    published: true,
  },

];

/**
 * Real jobs from Beezy's camera, already watermarked. Waiting on the image
 * files: the sources belong in `assets/brand-src/photos/` under these exact
 * names, after which `npm run brand` generates them and this list gets spread
 * into PHOTOS above.
 *
 * They are held out rather than referenced early because a fixture pointing at
 * a file that was never added ships a gallery of broken tiles —
 * `npm run check:assets` fails the build on exactly that.
 */
export const PENDING_WORK_PHOTOS: Photo[] = [
  {
    id: 'ph-work-impala',
    kind: 'after',
    url: photo('work-impala-64.webp'),
    capturedAt: at(-46),
    serviceSlug: 'beezy-wash',
    caption: "1964 Impala SS",
    published: true,
  },
  {
    id: 'ph-work-escalade',
    kind: 'after',
    url: photo('work-escalade.webp'),
    capturedAt: at(-33),
    serviceSlug: 'ceramic-coating',
    caption: 'Cadillac Escalade ESV',
    published: true,
  },
  {
    id: 'ph-work-sierra',
    kind: 'after',
    url: photo('work-sierra-at4.webp'),
    capturedAt: at(-19),
    serviceSlug: 'luxe-wash',
    caption: 'GMC Sierra AT4',
    published: true,
  },
  {
    id: 'ph-work-mclaren-doors',
    kind: 'after',
    url: photo('work-mclaren-doors.webp'),
    capturedAt: at(-8),
    serviceSlug: 'ceramic-coating',
    caption: 'McLaren GT',
    published: true,
  },
  {
    id: 'ph-work-mclaren',
    kind: 'after',
    url: photo('work-mclaren.webp'),
    capturedAt: at(-8),
    serviceSlug: 'ceramic-coating',
    caption: 'McLaren GT',
    published: true,
  },
];

/** Before/after pairs, for the comparison slider. */
export function photoPairs(): { before: Photo; after: Photo; serviceSlug?: string }[] {
  const keys = [...new Set(PHOTOS.filter((p) => p.pairKey).map((p) => p.pairKey))];
  const pairs = [];
  for (const key of keys) {
    const before = PHOTOS.find((p) => p.pairKey === key && p.kind === 'before');
    const after = PHOTOS.find((p) => p.pairKey === key && p.kind === 'after');
    if (before && after) pairs.push({ before, after, serviceSlug: before.serviceSlug });
  }
  return pairs;
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

/**
 * Every benefit names a physical service. Copy like "unlocks premium features"
 * reads to a reviewer as a digital good and invites an IAP rejection under
 * guideline 3.1.5(a) — see docs/COMPLIANCE.md.
 */
export const PLANS: Plan[] = [
  {
    tier: 'essentials',
    name: 'Beezy Essentials',
    priceCents: 12000,
    washesPerMonth: 1,
    addonDiscountPercent: 5,
    benefits: [
      'One Express Wash every month',
      'Beezy holds a weekday slot for you',
      '5% off any add-on service',
    ],
  },
  {
    tier: 'signature',
    name: 'Beezy Signature',
    priceCents: 26000,
    washesPerMonth: 2,
    addonDiscountPercent: 10,
    benefits: [
      'Two washes a month, one of them a Luxe',
      'A clay bar treatment every quarter',
      'Beezy holds Saturday mornings for Signature members',
      '10% off any add-on service',
    ],
  },
  {
    tier: 'black',
    name: 'Beezy Black',
    priceCents: 58000,
    washesPerMonth: 4,
    addonDiscountPercent: 15,
    benefits: [
      'Weekly or biweekly service, your choice of day',
      'Annual ceramic maintenance and decontamination',
      'A standing appointment on your chosen day',
      '15% off every service',
      'Beezy answers a dedicated line for Black members',
    ],
  },
];

export const DEMO_SUBSCRIPTION: Subscription = {
  planTier: 'signature',
  status: 'active',
  creditsRemaining: 1,
  creditsPerCycle: 2,
  renewsAt: at(11),
};

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export const PAYMENTS: Payment[] = [
  {
    id: 'pay-1',
    bookingId: 'bk-100',
    amountCents: 4000,
    kind: 'deposit',
    status: 'paid',
    paidAt: at(-2),
    cardBrand: 'Visa',
    cardLast4: '4242',
  },
  {
    id: 'pay-2',
    bookingId: 'bk-099',
    amountCents: 42500,
    kind: 'balance',
    status: 'paid',
    paidAt: at(-26),
    cardBrand: 'Visa',
    cardLast4: '4242',
  },
  {
    id: 'pay-3',
    bookingId: 'bk-098',
    amountCents: 11500,
    kind: 'balance',
    status: 'paid',
    paidAt: at(-54),
    cardBrand: 'Amex',
    cardLast4: '1008',
  },
];

// ---------------------------------------------------------------------------
// Reporting — shaped for the charts in §5.7
// ---------------------------------------------------------------------------

export const REVENUE_BY_WEEK = [
  { label: 'Jul 21', cents: 182000 },
  { label: 'Jul 28', cents: 241000 },
  { label: 'Aug 4', cents: 198000 },
  { label: 'Aug 11', cents: 276000 },
  { label: 'Aug 18', cents: 312000 },
  { label: 'Aug 25', cents: 264000 },
  { label: 'Sep 1', cents: 358000 },
  { label: 'Sep 8', cents: 291000 },
];

/**
 * The metric most detailers never see, and the one that changes behaviour: a
 * $399 clay bar that eats six hours earns less per hour than three Express
 * Washes.
 */
export const REVENUE_PER_HOUR = [
  { serviceSlug: 'express-wash', label: 'Express Wash', centsPerHour: 5200, jobs: 38 },
  { serviceSlug: 'luxe-wash', label: 'Luxe Wash', centsPerHour: 4900, jobs: 24 },
  { serviceSlug: 'beezy-wash', label: 'Beezy Wash', centsPerHour: 4600, jobs: 15 },
  { serviceSlug: 'headlight-restore', label: 'Headlight', centsPerHour: 6600, jobs: 9 },
  { serviceSlug: 'clay-bar', label: 'Clay Bar', centsPerHour: 3900, jobs: 6 },
  { serviceSlug: 'ceramic-coating', label: 'Ceramic', centsPerHour: 5900, jobs: 3 },
];

export const BOOKING_FUNNEL = [
  { step: 'Viewed services', count: 412 },
  { step: 'Started booking', count: 168 },
  { step: 'Added vehicle', count: 141 },
  { step: 'Uploaded photos', count: 96 },
  { step: 'Paid deposit', count: 74 },
];

export const EXPENSES = [
  { id: 'e1', label: 'Chemicals — Carpro restock', category: 'Supplies', cents: 28400, at: at(-3) },
  { id: 'e2', label: 'Fuel', category: 'Vehicle', cents: 9200, at: at(-4) },
  { id: 'e3', label: 'Pressure washer service', category: 'Equipment', cents: 14500, at: at(-11) },
  { id: 'e4', label: 'Microfiber towels (48)', category: 'Supplies', cents: 6800, at: at(-14) },
  { id: 'e5', label: 'Van insurance', category: 'Insurance', cents: 41200, at: at(-21) },
];

export const MILEAGE = [
  { id: 'm1', date: at(0), miles: 42, purpose: 'Uptown route — 3 jobs' },
  { id: 'm2', date: at(-1), miles: 61, purpose: 'Metairie + Lakeview' },
  { id: 'm3', date: at(-2), miles: 28, purpose: 'Garden District' },
  { id: 'm4', date: at(-3), miles: 74, purpose: 'Northshore fleet visit' },
];

export const TEAM = [
  { id: 't1', name: 'Brandon Schneider', role: 'owner' as const, initials: 'BS', jobsThisWeek: 11 },
  { id: 't2', name: 'Open seat', role: 'tech' as const, initials: '—', jobsThisWeek: 0 },
];
