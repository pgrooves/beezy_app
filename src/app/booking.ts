import { create } from 'zustand';
import { buildQuote } from '../core/pricing';
import { releasePhoto, useData, type SlotPhoto } from './data';
import { useSession } from './session';
import type { CapturedPhoto } from '../lib/platform';
import type { ConditionTier, Quote, ServiceAddress, SurchargeCode } from '../core/types';

/**
 * Booking flow state.
 *
 * Held in one store rather than threaded through seven screens, so a step can
 * be entered directly (or reloaded) without losing the rest of the answers,
 * and the running total in the footer can read the whole draft.
 *
 * The quote is derived, never stored: it recomputes from the draft and the
 * live service menu on every read, so the footer total and the review screen
 * can never disagree.
 */

export const BOOKING_STEPS = [
  { path: 'service', label: 'Service' },
  { path: 'vehicle', label: 'Vehicle' },
  { path: 'condition', label: 'Condition' },
  { path: 'location', label: 'Location' },
  { path: 'time', label: 'Time' },
  { path: 'review', label: 'Review' },
  { path: 'confirm', label: 'Requested' },
] as const;

export type StepPath = (typeof BOOKING_STEPS)[number]['path'];

export type PhotoSlot = 'exterior' | 'interior_front' | 'interior_rear' | 'cargo';

export interface ConditionPhoto {
  slot: PhotoSlot;
  label: string;
  photo?: CapturedPhoto;
}

interface BookingDraft {
  serviceIds: string[];
  vehicleId?: string;
  condition: ConditionTier;
  surcharges: SurchargeCode[];
  photos: ConditionPhoto[];
  address?: ServiceAddress;
  /**
   * Distance from base for the travel line. A flat in-radius figure until the
   * maps provider can measure it; inside the included radius it adds nothing.
   */
  travelMiles: number;
  scheduledAt?: string;
  /** Set once the request has been saved. */
  submitted?: { bookingId: string; failedPhotos: number };
}

interface BookingState extends BookingDraft {
  submitting: boolean;
  toggleService: (id: string) => void;
  setVehicle: (id: string) => void;
  setCondition: (tier: ConditionTier) => void;
  toggleSurcharge: (code: SurchargeCode) => void;
  setPhoto: (slot: PhotoSlot, photo: CapturedPhoto | undefined) => void;
  setAddress: (address: ServiceAddress) => void;
  setScheduledAt: (iso: string) => void;
  /** Saves the request and uploads the photos. Returns an error to show, or null. */
  submit: () => Promise<string | null>;
  reset: () => void;
  quote: () => Quote | null;
  /** Whether the given step has enough to move on. */
  canAdvance: (step: StepPath) => boolean;
}

const PHOTO_SLOTS: ConditionPhoto[] = [
  { slot: 'exterior', label: 'Exterior' },
  { slot: 'interior_front', label: 'Front seats' },
  { slot: 'interior_rear', label: 'Back seats' },
  { slot: 'cargo', label: 'Trunk / cargo' },
];

/** Two photos is the floor for an honest quote; four is the ask. */
export const MIN_PHOTOS = 2;

const initial = (): BookingDraft => ({
  serviceIds: [],
  condition: 'moderate',
  surcharges: [],
  photos: PHOTO_SLOTS.map((p) => ({ ...p })),
  travelMiles: 12,
});

const serviceById = (id: string) => useData.getState().services.find((s) => s.id === id);
const vehicleById = (id?: string) => useData.getState().vehicles.find((v) => v.id === id);

export const useBooking = create<BookingState>((set, get) => ({
  ...initial(),
  submitting: false,

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

  setPhoto: (slot, photo) =>
    set((s) => ({
      photos: s.photos.map((p) => {
        if (p.slot !== slot) return p;
        if (p.photo && p.photo !== photo) releasePhoto(p.photo);
        return { ...p, photo };
      }),
    })),

  setAddress: (address) => set({ address }),
  setScheduledAt: (scheduledAt) => set({ scheduledAt }),

  async submit() {
    const s = get();
    const quote = s.quote();
    const vehicle = vehicleById(s.vehicleId);
    const profile = useSession.getState().profile;
    if (!quote || !vehicle || !s.address || !s.scheduledAt || !profile) {
      return 'Something’s missing from the booking. Go back a step and check it.';
    }
    set({ submitting: true });
    const photos: SlotPhoto[] = s.photos.flatMap((p) => (p.photo ? [{ slot: p.slot, photo: p.photo }] : []));
    const result = await useData.getState().requestBooking(
      {
        clientId: profile.id,
        vehicle,
        serviceIds: s.serviceIds,
        condition: s.condition,
        surcharges: s.surcharges,
        address: s.address,
        scheduledAt: s.scheduledAt,
        quote,
      },
      photos,
    );
    set({ submitting: false });
    if (result.error || !result.data) return result.error ?? 'Your booking wasn’t sent.';
    set({ submitted: { bookingId: result.data.booking.id, failedPhotos: result.data.failedPhotos } });
    return null;
  },

  reset: () => {
    get().photos.forEach((p) => p.photo && releasePhoto(p.photo));
    set({ ...initial(), submitted: undefined, vehicleId: undefined, address: undefined, scheduledAt: undefined });
  },

  quote: () => {
    const s = get();
    const services = s.serviceIds.map(serviceById).filter((x): x is NonNullable<typeof x> => !!x);
    const vehicle = vehicleById(s.vehicleId);
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
        return s.serviceIds.some((id) => serviceById(id) && !serviceById(id)?.isAddon);
      case 'vehicle':
        return !!vehicleById(s.vehicleId);
      case 'condition':
        return s.photos.filter((p) => p.photo).length >= MIN_PHOTOS;
      case 'location':
        return !!s.address?.line1.trim();
      case 'time':
        return !!s.scheduledAt && new Date(s.scheduledAt).getTime() > Date.now();
      case 'review':
        return !!s.quote();
      case 'confirm':
        return !!s.submitted;
    }
  },
}));
