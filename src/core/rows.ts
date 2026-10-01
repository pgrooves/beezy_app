/**
 * Mapping between Supabase rows and domain types, for the tables the app
 * reads and writes directly. Pure, so the native app shares it.
 *
 * Each `*_COLUMNS` constant is the select list for its row type, kept beside
 * it so the two cannot drift.
 */
import type {
  BodyType,
  Booking,
  BookingStatus,
  ConditionTier,
  LineItem,
  Quote,
  Service,
  ServiceAddress,
  SurchargeCode,
  Vehicle,
} from './types';

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export interface ServiceRow {
  id: string;
  slug: string;
  name: string;
  summary: string;
  base_price_cents: number;
  base_duration_minutes: number;
  is_addon: boolean;
  is_premium: boolean;
  image_path: string | null;
  includes: string[] | null;
}

export const SERVICE_COLUMNS =
  'id, slug, name, summary, base_price_cents, base_duration_minutes, is_addon, is_premium, image_path, includes';

export function serviceFromRow(row: ServiceRow): Service {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    basePriceCents: row.base_price_cents,
    baseDurationMinutes: row.base_duration_minutes,
    isAddon: row.is_addon,
    isPremium: row.is_premium,
    imageUrl: row.image_path ?? undefined,
    includes: row.includes ?? [],
  };
}

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------

export interface VehicleRow {
  id: string;
  owner_id: string;
  year: number | null;
  make: string;
  model: string;
  colour: string | null;
  body_type: BodyType;
  third_row: boolean;
  vin: string | null;
  plate: string | null;
  notes: string | null;
  coating_applied_at: string | null;
  coating_warranty_expires_at: string | null;
}

export const VEHICLE_COLUMNS =
  'id, owner_id, year, make, model, colour, body_type, third_row, vin, plate, notes, coating_applied_at, coating_warranty_expires_at';

export function vehicleFromRow(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    ownerId: row.owner_id,
    year: row.year ?? 0,
    make: row.make,
    model: row.model,
    colour: row.colour ?? '',
    bodyType: row.body_type,
    thirdRow: row.third_row,
    vin: row.vin ?? undefined,
    plate: row.plate ?? undefined,
    notes: row.notes ?? undefined,
    coatingAppliedAt: row.coating_applied_at ?? undefined,
    coatingWarrantyExpiresAt: row.coating_warranty_expires_at ?? undefined,
  };
}

/** What the vehicle form edits. Coating dates are Beezy's to set, not the customer's. */
export type VehicleInput = Pick<Vehicle, 'year' | 'make' | 'model' | 'colour' | 'bodyType' | 'thirdRow'> &
  Partial<Pick<Vehicle, 'vin' | 'plate' | 'notes'>>;

const blank = (value: string | undefined) => (value && value.trim() ? value.trim() : null);

export function vehicleInputToRow(input: VehicleInput) {
  return {
    year: input.year || null,
    make: input.make.trim(),
    model: input.model.trim(),
    colour: blank(input.colour),
    body_type: input.bodyType,
    third_row: input.thirdRow,
    vin: blank(input.vin)?.toUpperCase() ?? null,
    plate: blank(input.plate)?.toUpperCase() ?? null,
    notes: blank(input.notes),
  };
}

/** "2023 Porsche Macan" — the label frozen onto a booking. */
export function vehicleLabel(v: Pick<Vehicle, 'year' | 'make' | 'model'>): string {
  return [v.year || '', v.make, v.model].join(' ').trim();
}

/** Errors a person can fix, in their words. Empty when the input is usable. */
export function validateVehicle(input: VehicleInput): string[] {
  const errors: string[] = [];
  if (!input.make.trim()) errors.push('Add the make, like Porsche or Ford.');
  if (!input.model.trim()) errors.push('Add the model, like Macan or F-150.');
  const nextYear = new Date().getFullYear() + 1;
  if (input.year && (input.year < 1900 || input.year > nextYear)) {
    errors.push(`The year should be between 1900 and ${nextYear}.`);
  }
  if (input.vin && !/^[A-HJ-NPR-Z0-9]{17}$/i.test(input.vin.trim())) {
    errors.push('A VIN is 17 letters and numbers, with no I, O or Q.');
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export interface BookingRow {
  id: string;
  client_id: string | null;
  vehicle_id: string | null;
  vehicle_label: string;
  service_ids: string[];
  condition: ConditionTier;
  surcharges: string[];
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string;
  postal_code: string | null;
  gate_code: string | null;
  parking_notes: string | null;
  covered: boolean;
  latitude: number | null;
  longitude: number | null;
  scheduled_at: string;
  duration_minutes: number;
  status: BookingStatus;
  subtotal_cents: number;
  deposit_cents: number;
  quote_lines: LineItem[] | null;
  needs_review: boolean;
  final_cents: number | null;
  notes: string | null;
  created_at: string;
}

export const BOOKING_COLUMNS =
  'id, client_id, vehicle_id, vehicle_label, service_ids, condition, surcharges, address_line1, address_line2, city, state, postal_code, gate_code, parking_notes, covered, latitude, longitude, scheduled_at, duration_minutes, status, subtotal_cents, deposit_cents, quote_lines, needs_review, final_cents, notes, created_at';

const SURCHARGE_CODES: readonly SurchargeCode[] = ['pet_hair', 'gulf_sand', 'biohazard'];

export function bookingFromRow(row: BookingRow): Booking {
  return {
    id: row.id,
    clientId: row.client_id ?? '',
    vehicleId: row.vehicle_id ?? '',
    vehicleLabel: row.vehicle_label,
    serviceIds: row.service_ids,
    condition: row.condition,
    surcharges: row.surcharges.filter((c): c is SurchargeCode =>
      (SURCHARGE_CODES as readonly string[]).includes(c),
    ),
    address: {
      line1: row.address_line1 ?? '',
      line2: row.address_line2 ?? undefined,
      city: row.city ?? '',
      state: row.state,
      postalCode: row.postal_code ?? '',
      gateCode: row.gate_code ?? undefined,
      parkingNotes: row.parking_notes ?? undefined,
      covered: row.covered,
      lat: row.latitude ?? undefined,
      lng: row.longitude ?? undefined,
    },
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes,
    status: row.status,
    depositCents: row.deposit_cents,
    totalCents: row.subtotal_cents,
    finalCents: row.final_cents ?? undefined,
    needsReview: row.needs_review,
    quoteLines: row.quote_lines ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export interface BookingRequest {
  clientId: string;
  vehicle: Pick<Vehicle, 'id' | 'year' | 'make' | 'model'>;
  serviceIds: string[];
  condition: ConditionTier;
  surcharges: SurchargeCode[];
  address: ServiceAddress;
  scheduledAt: string;
  quote: Quote;
}

/**
 * The insert a customer is allowed to make: status, final price and Square
 * id are left to their defaults, which the database's guard trigger enforces
 * anyway (0005).
 */
export function bookingRequestToRow(req: BookingRequest) {
  const a = req.address;
  return {
    client_id: req.clientId,
    vehicle_id: req.vehicle.id,
    vehicle_label: vehicleLabel(req.vehicle),
    service_ids: req.serviceIds,
    condition: req.condition,
    surcharges: req.surcharges,
    address_line1: a.line1.trim(),
    address_line2: blank(a.line2),
    city: blank(a.city),
    state: a.state || 'LA',
    postal_code: blank(a.postalCode),
    gate_code: blank(a.gateCode),
    parking_notes: blank(a.parkingNotes),
    covered: a.covered,
    latitude: a.lat ?? null,
    longitude: a.lng ?? null,
    scheduled_at: req.scheduledAt,
    duration_minutes: req.quote.estimatedMinutes,
    subtotal_cents: req.quote.subtotalCents,
    deposit_cents: req.quote.depositCents,
    quote_lines: req.quote.lines,
    needs_review: req.quote.needsReview,
  };
}

// ---------------------------------------------------------------------------
// Reading a list of bookings
// ---------------------------------------------------------------------------

const LIVE: readonly BookingStatus[] = ['requested', 'confirmed', 'en_route', 'in_progress'];

/** The soonest booking still to happen, if any. */
export function nextBooking(bookings: Booking[], now = Date.now()): Booking | undefined {
  return bookings
    .filter((b) => LIVE.includes(b.status) && new Date(b.scheduledAt).getTime() + b.durationMinutes * 60_000 > now)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];
}

/** Work that happened, newest first. */
export function pastBookings(bookings: Booking[]): Booking[] {
  return bookings
    .filter((b) => b.status === 'complete' || b.status === 'paid')
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
}

/** A customer can cancel until the van is on its way. */
export function canCancel(booking: Booking): boolean {
  return booking.status === 'requested' || booking.status === 'confirmed';
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  en_route: 'On the way',
  in_progress: 'In progress',
  complete: 'Complete',
  paid: 'Complete',
  cancelled: 'Cancelled',
};

/** Body types as a customer would name them, in the order the form lists them. */
export const BODY_TYPE_LABEL: Record<BodyType, string> = {
  coupe: 'Coupe or convertible',
  sedan: 'Sedan or hatchback',
  compact_suv: 'Compact SUV',
  mid_suv: 'Midsize SUV',
  large_suv: 'Full-size SUV',
  truck: 'Pickup truck',
  van: 'Van or minivan',
  xl: 'Oversized (dually, lifted, limo)',
};
