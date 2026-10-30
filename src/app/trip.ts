import { create } from 'zustand';
import { platform } from '../lib/platform';
import {
  MAX_CHILD_SEATS,
  MAX_HOURS,
  MAX_STOPS,
  defaultTrip,
  fits,
  quoteTrip,
  smallestFit,
  tripProblem,
  vehicleClass,
  withType,
  type Place,
  type TripDraft,
  type TripExtraId,
  type TripQuote,
  type TripType,
  type VehicleClassId,
} from '../core/trips';

/**
 * The chauffeur trip being built.
 *
 * Fixtures only until step C3 (DECISIONS.md#0025): nothing here is saved or
 * sent, so a reload starts a fresh draft. The rules all live in core/trips;
 * this file only holds the draft and applies them.
 */

export const TRIP_STEPS = [
  { path: 'build', label: 'Build' },
  { path: 'review', label: 'Review' },
] as const;

export type TripStepPath = (typeof TRIP_STEPS)[number]['path'];

/** Where the place picker is writing. */
export type PlaceSlot = { kind: 'pickup' } | { kind: 'dropoff' } | { kind: 'stop'; index: number } | { kind: 'newStop' };

interface TripState extends TripDraft {
  setType: (type: TripType) => void;
  setWhen: (patch: { date?: string; time?: string }) => void;
  setHours: (hours: number) => void;
  setParty: (patch: { passengers?: number; bags?: number }) => void;
  setVehicleClass: (id: VehicleClassId) => void;
  setPlace: (slot: PlaceSlot, place: Place) => void;
  removeStop: (index: number) => void;
  setFlight: (flight: string) => void;
  toggleReturn: () => void;
  toggleExtra: (id: TripExtraId) => void;
  setChildSeats: (n: number) => void;
  /** Start from a quick pick on Chauffeur's home. */
  startFrom: (preset: TripPreset) => void;
  reset: () => void;
  quote: () => TripQuote;
  problem: () => string | null;
}

export type TripPreset = 'airport' | 'hourly' | 'p2p' | 'group';

const draftOf = (s: TripState): TripDraft => ({
  type: s.type,
  date: s.date,
  time: s.time,
  hours: s.hours,
  passengers: s.passengers,
  bags: s.bags,
  vehicleClass: s.vehicleClass,
  pickup: s.pickup,
  stops: s.stops,
  dropoff: s.dropoff,
  flight: s.flight,
  returnTrip: s.returnTrip,
  extras: s.extras,
  childSeats: s.childSeats,
});

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export const useTrip = create<TripState>((set, get) => ({
  ...defaultTrip(new Date()),

  setType: (type) => {
    platform.haptics.selection();
    set((s) => withType(draftOf(s), type));
  },
  setWhen: (patch) => set(patch),
  setHours: (hours) => set({ hours: clamp(hours, 1, MAX_HOURS) }),

  // A party that outgrows the chosen vehicle moves up to the smallest one
  // that fits, rather than leaving an impossible choice selected.
  setParty: (patch) =>
    set((s) => {
      const passengers = clamp(patch.passengers ?? s.passengers, 1, 12);
      const bags = clamp(patch.bags ?? s.bags, 0, 12);
      const vehicle = fits(vehicleClass(s.vehicleClass), passengers, bags)
        ? s.vehicleClass
        : smallestFit(passengers, bags);
      return { passengers, bags, vehicleClass: vehicle };
    }),

  setVehicleClass: (id) => {
    const s = get();
    if (!fits(vehicleClass(id), s.passengers, s.bags)) return;
    platform.haptics.selection();
    set({ vehicleClass: id });
  },

  setPlace: (slot, place) =>
    set((s) => {
      switch (slot.kind) {
        case 'pickup':
          return { pickup: place };
        case 'dropoff':
          return { dropoff: place };
        case 'stop':
          return { stops: s.stops.map((p, i) => (i === slot.index ? place : p)) };
        case 'newStop':
          return s.stops.length >= MAX_STOPS ? s : { stops: [...s.stops, place] };
      }
    }),

  removeStop: (index) => set((s) => ({ stops: s.stops.filter((_, i) => i !== index) })),
  setFlight: (flight) => set({ flight: flight.toUpperCase() }),
  toggleReturn: () => set((s) => ({ returnTrip: !s.returnTrip })),
  toggleExtra: (id) =>
    set((s) => ({ extras: s.extras.includes(id) ? s.extras.filter((e) => e !== id) : [...s.extras, id] })),
  setChildSeats: (n) => set({ childSeats: clamp(n, 0, MAX_CHILD_SEATS) }),

  startFrom: (preset) => {
    const fresh = defaultTrip(new Date());
    if (preset === 'group') {
      set({ ...fresh, passengers: 10, bags: 2, vehicleClass: 'sprinter', hours: 5, stops: [] });
    } else {
      set(withType(fresh, preset));
    }
  },

  reset: () => set(defaultTrip(new Date())),
  quote: () => quoteTrip(draftOf(get())),
  problem: () => tripProblem(draftOf(get()), new Date()),
}));
