import { create } from 'zustand';
import { buildQuote } from '../core/pricing';
import { SERVICES, VEHICLES, serviceById } from '../core/fixtures';
import type { ConditionTier, Quote, ServiceAddress, SurchargeCode } from '../core/types';

/**
 * Booking flow state.
 *
 * Held in one store rather than threaded through seven screens, so a step can
 * be entered directly (or reloaded) without losing the rest of the answers,
 * and the running total in the footer can read the whole draft.
 *
 * The quote is derived, never stored: it recomputes from the draft on every
 * read, so the footer total and the confirm screen can never disagree.
 */

export const BOOKING_STEPS = [
  { path: 'service', label: 'Service' },
  { path: 'vehicle', label: 'Vehicle' },
  { path: 'condition', label: 'Condition' },
  { path: 'location', label: 'Location' },
  { path: 'time', label: 'Time' },
  { path: 'deposit', label: 'Deposit' },
  { path: 'confirm', label: 'Confirm' },
] as const;

export type StepPath = (typeof BOOKING_STEPS)[number]['path'];

/** Placeholder photos, until the camera adapter lands in Phase 3. */
export interface ConditionPhoto {
  slot: 'exterior' | 'interior_front' | 'interior_rear' | 'cargo';
  label: string;
  captured: boolean;
}

interface BookingDraft {
  serviceIds: string[];
  vehicleId?: string;
  condition: ConditionTier;
  surcharges: SurchargeCode[];
  photos: ConditionPhoto[];
  address?: ServiceAddress;
  travelMiles: number;
  scheduledAt?: string;
  cardOnFile: boolean;
  confirmed: boolean;
}

interface BookingState extends BookingDraft {
  toggleService: (id: string) => void;
  setVehicle: (id: string) => void;
  setCondition: (tier: ConditionTier) => void;
  toggleSurcharge: (code: SurchargeCode) => void;
  capturePhoto: (slot: ConditionPhoto['slot']) => void;
  setAddress: (address: ServiceAddress) => void;
  setScheduledAt: (iso: string) => void;
  setCardOnFile: (value: boolean) => void;
  confirm: () => void;
  reset: () => void;
  quote: () => Quote | null;
  /** Whether the given step has enough to move on. */
  canAdvance: (step: StepPath) => boolean;
}

const PHOTO_SLOTS: ConditionPhoto[] = [
  { slot: 'exterior', label: 'Exterior', captured: false },
  { slot: 'interior_front', label: 'Front seats', captured: false },
  { slot: 'interior_rear', label: 'Back seats', captured: false },
  { slot: 'cargo', label: 'Trunk / cargo', captured: false },
];

const initial: BookingDraft = {
  serviceIds: [],
  condition: 'moderate',
  surcharges: [],
  photos: PHOTO_SLOTS,
  travelMiles: 12,
  cardOnFile: false,
  confirmed: false,
};

export const useBooking = create<BookingState>((set, get) => ({
  ...initial,

  toggleService: (id) =>
    set((s) => {
      const service = serviceById(id);
      if (!service) return s;
      if (s.serviceIds.includes(id)) {
        return { serviceIds: s.serviceIds.filter((x) => x !== id) };
      }
      // Only one base service at a time; add-ons stack on top of it.
      if (!service.isAddon) {
        const addons = s.serviceIds.filter((x) => serviceById(x)?.isAddon);
        return { serviceIds: [id, ...addons] };
      }
      return { serviceIds: [...s.serviceIds, id] };
    }),

  setVehicle: (vehicleId) => set({ vehicleId }),
  setCondition: (condition) => set({ condition }),

  toggleSurcharge: (code) =>
    set((s) => ({
      surcharges: s.surcharges.includes(code)
        ? s.surcharges.filter((c) => c !== code)
        : [...s.surcharges, code],
    })),

  capturePhoto: (slot) =>
    set((s) => ({
      photos: s.photos.map((p) => (p.slot === slot ? { ...p, captured: !p.captured } : p)),
    })),

  setAddress: (address) => set({ address }),
  setScheduledAt: (scheduledAt) => set({ scheduledAt }),
  setCardOnFile: (cardOnFile) => set({ cardOnFile }),
  confirm: () => set({ confirmed: true }),
  reset: () => set({ ...initial }),

  quote: () => {
    const s = get();
    const services = s.serviceIds.map(serviceById).filter((x): x is NonNullable<typeof x> => !!x);
    const vehicle = VEHICLES.find((v) => v.id === s.vehicleId);
    if (!services.length || !vehicle) return null;
    return buildQuote({
      services,
      vehicle,
      condition: s.condition,
      surcharges: s.surcharges,
      travelMiles: s.travelMiles,
    });
  },

  canAdvance: (step) => {
    const s = get();
    switch (step) {
      case 'service':
        // At least one non-addon: a clay bar with no wash under it is not a job.
        return s.serviceIds.some((id) => !serviceById(id)?.isAddon);
      case 'vehicle':
        return !!s.vehicleId;
      case 'condition':
        // Two photos is the floor for an honest quote; four is the ask.
        return s.photos.filter((p) => p.captured).length >= 2;
      case 'location':
        return !!s.address?.line1;
      case 'time':
        return !!s.scheduledAt;
      case 'deposit':
        return s.cardOnFile;
      case 'confirm':
        return true;
    }
  },
}));

export const ALL_SERVICES = SERVICES;
