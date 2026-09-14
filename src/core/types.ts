/**
 * Domain types.
 *
 * Pure TypeScript, no imports — this file ports to React Native unchanged and
 * mirrors the Supabase schema in supabase/migrations. When the backend is
 * wired up these stay; only the data source changes.
 */

export type Role = 'customer' | 'tech' | 'admin' | 'owner';

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------

export type BodyType =
  | 'coupe'
  | 'sedan'
  | 'compact_suv'
  | 'mid_suv'
  | 'large_suv'
  | 'truck'
  | 'van'
  | 'xl';

/** Pricing bands. Derived from body type + third row, never asked directly. */
export type SizeClass = 'compact' | 'standard' | 'mid' | 'large' | 'xl';

export interface Vehicle {
  id: string;
  ownerId: string;
  year: number;
  make: string;
  model: string;
  colour: string;
  bodyType: BodyType;
  /** Forces the large band regardless of body type. */
  thirdRow: boolean;
  vin?: string;
  plate?: string;
  notes?: string;
  photoUrl?: string;
  coatingAppliedAt?: string;
  coatingWarrantyExpiresAt?: string;
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export interface Service {
  id: string;
  slug: string;
  name: string;
  /** Plain-language outcome copy for the service card. */
  summary: string;
  /** Floor price in cents for a standard sedan in light condition. */
  basePriceCents: number;
  baseDurationMinutes: number;
  /** Attachable to another service rather than booked alone. */
  isAddon: boolean;
  /** Rendered with the champagne accent. */
  isPremium: boolean;
  imageUrl?: string;
  /** Bullet list shown on the detail sheet. */
  includes: string[];
}

/** Condition tiers, in the customer's words. */
export type ConditionTier = 'light' | 'moderate' | 'heavy' | 'extreme';

/** Discrete add-ons that are additive, not multiplicative. */
export type SurchargeCode = 'pet_hair' | 'gulf_sand' | 'biohazard';

// ---------------------------------------------------------------------------
// Bookings & jobs
// ---------------------------------------------------------------------------

export type BookingStatus =
  | 'requested'
  | 'confirmed'
  | 'en_route'
  | 'in_progress'
  | 'complete'
  | 'paid'
  | 'cancelled';

export interface ServiceAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  gateCode?: string;
  parkingNotes?: string;
  covered: boolean;
  lat?: number;
  lng?: number;
}

export interface Booking {
  id: string;
  clientId: string;
  vehicleId: string;
  serviceIds: string[];
  condition: ConditionTier;
  surcharges: SurchargeCode[];
  address: ServiceAddress;
  scheduledAt: string;
  durationMinutes: number;
  status: BookingStatus;
  depositCents: number;
  totalCents: number;
  /** Set by the tech on site, approved by the customer before work starts. */
  finalCents?: number;
  notes?: string;
  createdAt: string;
  /** Present when the booking originated in Square rather than the app. */
  squareBookingId?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  /** Requires a photo before it can be ticked. */
  requiresPhoto?: boolean;
}

export type PhotoKind = 'before' | 'after' | 'damage' | 'condition';

export interface Photo {
  id: string;
  jobId?: string;
  bookingId?: string;
  kind: PhotoKind;
  url: string;
  /** Pairs a before with its after for the comparison slider. */
  pairKey?: string;
  capturedAt: string;
  serviceSlug?: string;
  /** Published to the public gallery, with consent. */
  published?: boolean;
}

export interface Job {
  id: string;
  bookingId: string;
  assignedTechId?: string;
  startedAt?: string;
  completedAt?: string;
  checklist: ChecklistItem[];
  photoIds: string[];
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export type ClientTag = 'vip' | 'fleet' | 'recurring' | 'lapsed';

export interface Client {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  tags: ClientTag[];
  since: string;
  lifetimeValueCents: number;
  jobCount: number;
  lastServiceAt?: string;
  notes?: string;
  avatarInitials: string;
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export type PlanTier = 'essentials' | 'signature' | 'black';

export interface Plan {
  tier: PlanTier;
  name: string;
  priceCents: number;
  /**
   * Every benefit is phrased as a physical service. Copy that implies the
   * subscription unlocks app features invites an IAP rejection under
   * guideline 3.1.5(a) — see docs/COMPLIANCE.md.
   */
  benefits: string[];
  washesPerMonth: number;
  addonDiscountPercent: number;
}

export interface Subscription {
  planTier: PlanTier;
  status: 'active' | 'paused' | 'past_due' | 'cancelled';
  creditsRemaining: number;
  creditsPerCycle: number;
  renewsAt: string;
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

export interface LineItem {
  label: string;
  /** Sub-label explaining where the number came from. */
  detail?: string;
  amountCents: number;
}

export interface Quote {
  lines: LineItem[];
  subtotalCents: number;
  depositCents: number;
  /** True when the tier needs Beezy's eyes before it can be committed to. */
  needsReview: boolean;
  estimatedMinutes: number;
}

export interface Payment {
  id: string;
  bookingId: string;
  amountCents: number;
  kind: 'deposit' | 'balance' | 'subscription';
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  paidAt?: string;
  cardBrand?: string;
  cardLast4?: string;
}
