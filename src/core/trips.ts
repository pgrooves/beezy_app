import type { LineItem } from './types';

/**
 * Chauffeur trips: vehicle classes, sample rates, and the estimate.
 *
 * Every rate here is a PLACEHOLDER until Brandon sets the real rate card
 * (DECISIONS.md#0025). They move to a `rate_cards` table in step C3, where an
 * edge function recomputes the price server-side before anything is charged,
 * exactly as detailing deposits will. Until then this file is the whole
 * pricing model, and the screens say the figures are examples.
 */

export type TripType = 'p2p' | 'airport' | 'hourly';
export type VehicleClassId = 'sedan' | 'suv' | 'sprinter';
export type TripExtraId = 'meet' | 'champagne' | 'decor';

export interface VehicleClass {
  id: VehicleClassId;
  name: string;
  /** "S-Class or similar" — the class, not a promise of a model. */
  example: string;
  seats: number;
  bags: number;
  hourlyCents: number;
  minHours: number;
  airportCents: number;
  /** Point-to-point base fare. The real fare adds route miles (C3). */
  baseCents: number;
}

export interface Place {
  id: string;
  name: string;
  address: string;
}

export interface TripExtra {
  id: TripExtraId;
  label: string;
  priceCents: number;
}

export interface TripDraft {
  type: TripType;
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  /** Local time, HH:MM. For an airport pickup, when the flight lands. */
  time: string;
  /** Hours booked, for `hourly`. */
  hours: number;
  passengers: number;
  bags: number;
  vehicleClass: VehicleClassId;
  pickup: Place;
  stops: Place[];
  dropoff: Place;
  flight: string;
  returnTrip: boolean;
  extras: TripExtraId[];
  childSeats: number;
}

export interface TripQuote {
  lines: LineItem[];
  totalCents: number;
  depositCents: number;
  /** How long the vehicle is committed, for the calendar. */
  hours: number;
}

export const TRIP_TYPE_LABEL: Record<TripType, string> = {
  p2p: 'Point to point',
  airport: 'Airport',
  hourly: 'By the hour',
};

export const VEHICLE_CLASSES: VehicleClass[] = [
  {
    id: 'sedan',
    name: 'Executive sedan',
    example: 'S-Class or similar',
    seats: 3,
    bags: 3,
    hourlyCents: 9500,
    minHours: 2,
    airportCents: 11500,
    baseCents: 8500,
  },
  {
    id: 'suv',
    name: 'Luxury SUV',
    example: 'Escalade ESV or similar',
    seats: 6,
    bags: 6,
    hourlyCents: 12500,
    minHours: 3,
    airportCents: 14500,
    baseCents: 11000,
  },
  {
    id: 'sprinter',
    name: 'Executive Sprinter',
    example: 'Mercedes Sprinter',
    seats: 12,
    bags: 12,
    hourlyCents: 16500,
    minHours: 4,
    airportCents: 22500,
    baseCents: 17500,
  },
];

export const TRIP_EXTRAS: TripExtra[] = [
  { id: 'meet', label: 'Meet & greet sign', priceCents: 2500 },
  { id: 'champagne', label: 'Champagne service', priceCents: 6500 },
  { id: 'decor', label: 'Event décor', priceCents: 5000 },
];

export const STOP_FEE_CENTS = 2000;
export const CHILD_SEAT_CENTS = 1500;
export const AFTER_HOURS_CENTS = 2500;
export const GRATUITY_RATE = 0.2;
export const DEPOSIT_RATE = 0.25;
export const MAX_STOPS = 8;
export const MAX_CHILD_SEATS = 3;
export const MAX_HOURS = 12;

export const AIRPORT: Place = {
  id: 'msy',
  name: 'MSY · Louis Armstrong Intl',
  address: '1 Terminal Dr, Kenner',
};

/**
 * Places to start from until address search exists (the `places` edge
 * function, C3). Real New Orleans addresses, so the screens read true.
 */
export const SAMPLE_PLACES: Place[] = [
  { id: 'windsor', name: 'Windsor Court Hotel', address: '300 Gravier St' },
  { id: 'commanders', name: 'Commander’s Palace', address: '1403 Washington Ave' },
  { id: 'frenchmen', name: 'Frenchmen Street', address: 'Marigny' },
  { id: 'roosevelt', name: 'The Roosevelt', address: '130 Roosevelt Way' },
  { id: 'superdome', name: 'Caesars Superdome', address: '1500 Sugar Bowl Dr' },
  { id: 'audubon', name: 'Audubon Park', address: '6500 Magazine St' },
  { id: 'fairgrounds', name: 'Fair Grounds', address: '1751 Gentilly Blvd' },
  AIRPORT,
];

export function vehicleClass(id: VehicleClassId): VehicleClass {
  return VEHICLE_CLASSES.find((c) => c.id === id) ?? VEHICLE_CLASSES[0]!;
}

export function fits(cls: VehicleClass, passengers: number, bags: number): boolean {
  return passengers <= cls.seats && bags <= cls.bags;
}

/** The smallest class that fits the party, or the largest if none does. */
export function smallestFit(passengers: number, bags: number): VehicleClassId {
  return (VEHICLE_CLASSES.find((c) => fits(c, passengers, bags)) ?? VEHICLE_CLASSES.at(-1)!).id;
}

/** Decimal hours from HH:MM. */
export function hourOf(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return h + m / 60;
}

/** Pickups from 11 PM to before 5 AM carry the after-hours fee. */
export function isAfterHours(time: string): boolean {
  const h = hourOf(time);
  return h >= 23 || h < 5;
}

/** How long the vehicle is out. Point-to-point allows a quarter hour a stop. */
export function tripHours(draft: TripDraft): number {
  if (draft.type === 'hourly') return Math.max(draft.hours, vehicleClass(draft.vehicleClass).minHours);
  const oneWay = (draft.type === 'airport' ? 1.25 : 1) + draft.stops.length * 0.25;
  return draft.returnTrip ? oneWay * 2 : oneWay;
}

export function quoteTrip(draft: TripDraft): TripQuote {
  const cls = vehicleClass(draft.vehicleClass);
  const lines: LineItem[] = [];
  let fare: number;

  if (draft.type === 'hourly') {
    const hours = Math.max(draft.hours, cls.minHours);
    fare = hours * cls.hourlyCents;
    lines.push({
      label: `${hours} hours × ${dollars(cls.hourlyCents)}`,
      detail:
        draft.hours < cls.minHours
          ? `${cls.minHours}-hour minimum for this vehicle`
          : 'Stops and waiting included',
      amountCents: fare,
    });
  } else {
    fare = draft.type === 'airport' ? cls.airportCents : cls.baseCents;
    lines.push({
      label: TRIP_TYPE_LABEL[draft.type],
      detail:
        draft.type === 'airport'
          ? 'Flat rate, 60 minutes free waiting after landing'
          : 'Base fare. The real fare adds miles from the route',
      amountCents: fare,
    });
    if (draft.stops.length) {
      const stops = draft.stops.length * STOP_FEE_CENTS;
      lines.push({
        label: `${draft.stops.length} extra stop${draft.stops.length === 1 ? '' : 's'}`,
        detail: `${dollars(STOP_FEE_CENTS)} each`,
        amountCents: stops,
      });
      fare += stops;
    }
    if (draft.returnTrip) {
      lines.push({ label: 'Return trip', detail: 'Same route back', amountCents: fare });
      fare *= 2;
    }
  }

  let extras = 0;
  for (const extra of TRIP_EXTRAS) {
    if (!draft.extras.includes(extra.id)) continue;
    lines.push({ label: extra.label, amountCents: extra.priceCents });
    extras += extra.priceCents;
  }
  if (draft.childSeats > 0) {
    const seats = draft.childSeats * CHILD_SEAT_CENTS;
    lines.push({
      label: `${draft.childSeats} child seat${draft.childSeats === 1 ? '' : 's'}`,
      detail: `${dollars(CHILD_SEAT_CENTS)} each`,
      amountCents: seats,
    });
    extras += seats;
  }
  if (isAfterHours(draft.time)) {
    lines.push({ label: 'After-hours pickup', detail: '11 PM to 5 AM', amountCents: AFTER_HOURS_CENTS });
    extras += AFTER_HOURS_CENTS;
  }

  // Gratuity on the fare, not on champagne or child seats.
  const gratuity = Math.round(fare * GRATUITY_RATE);
  lines.push({ label: 'Chauffeur gratuity', detail: '20%, included', amountCents: gratuity });

  const totalCents = fare + extras + gratuity;
  return {
    lines,
    totalCents,
    depositCents: Math.round(totalCents * DEPOSIT_RATE),
    hours: tripHours(draft),
  };
}

/** Pickup → stops → drop-off, by name. */
export function routeLabel(draft: Pick<TripDraft, 'pickup' | 'stops' | 'dropoff'>): string {
  return [draft.pickup, ...draft.stops, draft.dropoff].map((p) => p.name).join(' → ');
}

/** What still stops the trip being reviewed, or null when it is ready. */
export function tripProblem(draft: TripDraft, now: Date): string | null {
  if (!draft.date || !draft.time) return 'Pick a date and time.';
  if (pickupAt(draft).getTime() <= now.getTime()) return 'Pick a time in the future.';
  if (draft.type === 'airport' && !draft.flight.trim()) return 'Add the flight number so we can track it.';
  if (draft.type === 'p2p' && !draft.returnTrip && draft.stops.length === 0 && draft.pickup.id === draft.dropoff.id) {
    return 'Pickup and drop-off are the same place.';
  }
  if (!fits(vehicleClass(draft.vehicleClass), draft.passengers, draft.bags)) {
    return 'That vehicle is too small for this party.';
  }
  return null;
}

/** Local pickup time. Dates are local to the device, like detailing slots. */
export function pickupAt(draft: Pick<TripDraft, 'date' | 'time'>): Date {
  return new Date(`${draft.date}T${draft.time}:00`);
}

/** YYYY-MM-DD for a local day. */
export function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A sensible first draft: an evening out, three days from now. */
export function defaultTrip(now: Date): TripDraft {
  const day = new Date(now);
  day.setDate(day.getDate() + 3);
  const hotel = SAMPLE_PLACES[0]!;
  return {
    type: 'hourly',
    date: dayKey(day),
    time: '18:30',
    hours: 4,
    passengers: 2,
    bags: 0,
    vehicleClass: 'suv',
    pickup: hotel,
    stops: [SAMPLE_PLACES[1]!],
    dropoff: hotel,
    flight: '',
    returnTrip: false,
    extras: [],
    childSeats: 0,
  };
}

/** Switching type reshapes the route so it still makes sense. */
export function withType(draft: TripDraft, type: TripType): TripDraft {
  if (draft.type === type) return draft;
  const next = { ...draft, type };
  if (type === 'airport') {
    next.pickup = AIRPORT;
    if (draft.dropoff.id === AIRPORT.id) next.dropoff = SAMPLE_PLACES[0]!;
    next.extras = draft.extras.includes('meet') ? draft.extras : [...draft.extras, 'meet'];
  } else if (draft.type === 'airport') {
    next.pickup = SAMPLE_PLACES[0]!;
    next.extras = draft.extras.filter((e) => e !== 'meet');
  }
  if (type === 'hourly') next.returnTrip = false;
  if (type === 'p2p' && next.dropoff.id === next.pickup.id) next.dropoff = SAMPLE_PLACES[3]!;
  return next;
}

function dollars(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US')}`;
}
