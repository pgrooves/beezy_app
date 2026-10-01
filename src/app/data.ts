import { useEffect } from 'react';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { platform, type CapturedPhoto } from '../lib/platform';
import { useSession } from './session';
import {
  BOOKING_COLUMNS,
  SERVICE_COLUMNS,
  VEHICLE_COLUMNS,
  bookingFromRow,
  bookingRequestToRow,
  serviceFromRow,
  vehicleFromRow,
  vehicleInputToRow,
  type BookingRequest,
  type BookingRow,
  type ServiceRow,
  type VehicleInput,
  type VehicleRow,
} from '../core/rows';
import { SERVICES as FIXTURE_SERVICES } from '../core/fixtures';
import type { Booking, BookingStatus, Service, Vehicle } from '../core/types';

/**
 * The app's real data: the service menu, the signed-in customer's garage and
 * bookings, and — for staff — incoming requests.
 *
 * One store, loaded on demand by the hooks at the bottom and cleared when the
 * signed-in person changes. Every write goes straight to Supabase and then
 * updates the store from what the database returned, so the screen shows
 * what was saved rather than what was sent. RLS decides what any of these
 * queries can see; nothing here filters by owner for security.
 */

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
export type Result<T = null> = { error: string | null; data?: T };

/** A booking as staff see it: the customer's name and number alongside. */
export interface StaffBooking extends Booking {
  client: { fullName: string; phone: string; email: string } | null;
}

interface DataState {
  services: Service[];
  servicesState: LoadState;
  vehicles: Vehicle[];
  vehiclesState: LoadState;
  bookings: Booking[];
  bookingsState: LoadState;
  requests: StaffBooking[];
  requestsState: LoadState;

  loadServices: () => Promise<void>;
  loadVehicles: () => Promise<void>;
  loadBookings: () => Promise<void>;
  loadRequests: () => Promise<void>;
  saveVehicle: (id: string | null, input: VehicleInput) => Promise<Result<Vehicle>>;
  removeVehicle: (id: string) => Promise<Result>;
  requestBooking: (request: BookingRequest, photos: SlotPhoto[]) => Promise<Result<RequestOutcome>>;
  cancelBooking: (id: string) => Promise<Result>;
  setBookingStatus: (id: string, status: BookingStatus) => Promise<Result>;
  photoUrls: (bookingId: string) => Promise<{ slot: string | null; url: string }[]>;
}

export interface SlotPhoto {
  slot: string;
  photo: CapturedPhoto;
}

export interface RequestOutcome {
  booking: Booking;
  /** Photos that did not upload. The booking stands either way. */
  failedPhotos: number;
}

const OFFLINE = 'That didn’t save. Check your connection and try again.';

const EMPTY_USER_DATA = {
  vehicles: [] as Vehicle[],
  vehiclesState: 'idle' as LoadState,
  bookings: [] as Booking[],
  bookingsState: 'idle' as LoadState,
  requests: [] as StaffBooking[],
  requestsState: 'idle' as LoadState,
};

const byScheduled = (a: Booking, b: Booking) => a.scheduledAt.localeCompare(b.scheduledAt);

export const useData = create<DataState>((set, get) => ({
  services: [],
  servicesState: 'idle',
  ...EMPTY_USER_DATA,

  async loadServices() {
    if (get().servicesState === 'loading') return;
    // A build without Supabase still shows the menu (it is public content),
    // from the same copy the database was seeded with. Nothing can be booked
    // on it: booking needs a signed-in session, which such a build cannot have.
    if (!supabase) {
      set({ services: FIXTURE_SERVICES, servicesState: 'ready' });
      return;
    }
    set({ servicesState: 'loading' });
    const { data, error } = await supabase
      .from('services')
      .select(SERVICE_COLUMNS)
      .eq('active', true)
      .order('sort_order')
      .returns<ServiceRow[]>();
    if (error || !data) {
      set({ servicesState: 'error' });
      return;
    }
    set({ services: data.map(serviceFromRow), servicesState: 'ready' });
  },

  async loadVehicles() {
    const me = useSession.getState().profile;
    if (!supabase || !me || get().vehiclesState === 'loading') return;
    set({ vehiclesState: 'loading' });
    const { data, error } = await supabase
      .from('vehicles')
      .select(VEHICLE_COLUMNS)
      .eq('owner_id', me.id)
      .order('created_at')
      .returns<VehicleRow[]>();
    if (error || !data) {
      set({ vehiclesState: 'error' });
      return;
    }
    set({ vehicles: data.map(vehicleFromRow), vehiclesState: 'ready' });
  },

  async loadBookings() {
    const me = useSession.getState().profile;
    if (!supabase || !me || get().bookingsState === 'loading') return;
    set({ bookingsState: 'loading' });
    const { data, error } = await supabase
      .from('bookings')
      .select(BOOKING_COLUMNS)
      .eq('client_id', me.id)
      .order('scheduled_at', { ascending: false })
      .returns<BookingRow[]>();
    if (error || !data) {
      set({ bookingsState: 'error' });
      return;
    }
    set({ bookings: data.map(bookingFromRow), bookingsState: 'ready' });
  },

  async loadRequests() {
    if (!supabase || get().requestsState === 'loading') return;
    set({ requestsState: 'loading' });
    // Everything not yet finished, from yesterday on. Staff RLS returns every
    // customer's; a customer reaching this would get only their own.
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { data, error } = await supabase
      .from('bookings')
      .select(`${BOOKING_COLUMNS}, client:profiles!bookings_client_id_fkey(full_name, phone, email)`)
      .in('status', ['requested', 'confirmed', 'en_route', 'in_progress'])
      .gte('scheduled_at', since)
      .order('scheduled_at')
      .returns<(BookingRow & { client: { full_name: string | null; phone: string | null; email: string | null } | null })[]>();
    if (error || !data) {
      set({ requestsState: 'error' });
      return;
    }
    set({
      requests: data.map((row) => ({
        ...bookingFromRow(row),
        client: row.client
          ? {
              fullName: row.client.full_name ?? '',
              phone: row.client.phone ?? '',
              email: row.client.email ?? '',
            }
          : null,
      })),
      requestsState: 'ready',
    });
  },

  async saveVehicle(id, input) {
    const me = useSession.getState().profile;
    if (!supabase || !me) return { error: OFFLINE };
    const row = vehicleInputToRow(input);
    const query = id
      ? supabase.from('vehicles').update(row).eq('id', id)
      : supabase.from('vehicles').insert({ ...row, owner_id: me.id });
    const { data, error } = await query.select(VEHICLE_COLUMNS).single<VehicleRow>();
    if (error || !data) return { error: OFFLINE };
    const vehicle = vehicleFromRow(data);
    set((s) => ({
      vehicles: id
        ? s.vehicles.map((v) => (v.id === id ? vehicle : v))
        : [...s.vehicles, vehicle],
    }));
    return { error: null, data: vehicle };
  },

  async removeVehicle(id) {
    if (!supabase) return { error: OFFLINE };
    // Past bookings keep their frozen vehicle label (0005), so removing a car
    // from the garage never rewrites history.
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) return { error: OFFLINE };
    set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== id) }));
    return { error: null };
  },

  async requestBooking(request, photos) {
    if (!supabase) return { error: OFFLINE };
    const { data, error } = await supabase
      .from('bookings')
      .insert(bookingRequestToRow(request))
      .select(BOOKING_COLUMNS)
      .single<BookingRow>();
    if (error || !data) {
      // The guard trigger's own messages are written for this case.
      if (error?.message.includes('must be in the future')) {
        return { error: 'That time has passed. Pick another slot.' };
      }
      return { error: 'Your booking wasn’t sent. Check your connection and try again.' };
    }
    const booking = bookingFromRow(data);
    set((s) => ({ bookings: [booking, ...s.bookings] }));

    const failedPhotos = await uploadConditionPhotos(request.clientId, booking, photos);
    return { error: null, data: { booking, failedPhotos } };
  },

  async cancelBooking(id) {
    if (!supabase) return { error: OFFLINE };
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select(BOOKING_COLUMNS)
      .single<BookingRow>();
    if (error || !data) return { error: 'That didn’t cancel. Check your connection, or text Beezy.' };
    const updated = bookingFromRow(data);
    set((s) => ({ bookings: s.bookings.map((b) => (b.id === id ? updated : b)) }));
    return { error: null };
  },

  async setBookingStatus(id, status) {
    if (!supabase) return { error: OFFLINE };
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
    if (error) return { error: OFFLINE };
    set((s) => ({
      requests:
        status === 'cancelled'
          ? s.requests.filter((b) => b.id !== id)
          : s.requests.map((b) => (b.id === id ? { ...b, status } : b)).sort(byScheduled),
    }));
    return { error: null };
  },

  async photoUrls(bookingId) {
    if (!supabase) return [];
    const { data } = await supabase
      .from('photos')
      .select('slot, storage_path')
      .eq('booking_id', bookingId)
      .order('created_at')
      .returns<{ slot: string | null; storage_path: string }[]>();
    if (!data?.length) return [];
    // Private bucket: short-lived signed URLs, never public ones.
    const { data: signed } = await supabase.storage
      .from('photos')
      .createSignedUrls(data.map((p) => p.storage_path), 3600);
    return (signed ?? []).flatMap((s, i) =>
      s.signedUrl ? [{ slot: data[i]?.slot ?? null, url: s.signedUrl }] : [],
    );
  },
}));

/**
 * Uploads to `<owner>/<booking>/<slot>-<random>.jpg`, the folder layout the
 * bucket policies check, then records each photo. Returns how many failed.
 */
async function uploadConditionPhotos(ownerId: string, booking: Booking, photos: SlotPhoto[]) {
  if (!supabase) return photos.length;
  const client = supabase;
  const results = await Promise.all(
    photos.map(async ({ slot, photo }) => {
      const path = `${ownerId}/${booking.id}/${slot}-${crypto.randomUUID()}.jpg`;
      const upload = await client.storage
        .from('photos')
        .upload(path, photo.blob, { contentType: 'image/jpeg', upsert: false });
      if (upload.error) return false;
      const { error } = await client.from('photos').insert({
        owner_id: ownerId,
        booking_id: booking.id,
        vehicle_id: booking.vehicleId || null,
        kind: 'condition',
        slot,
        storage_path: path,
        width: photo.width,
        height: photo.height,
        captured_at: photo.capturedAt,
      });
      return !error;
    }),
  );
  return results.filter((ok) => !ok).length;
}

// Someone else's garage must never flash up after an account switch on a
// shared device, so anything user-bound is dropped when the person changes.
let lastProfileId: string | null = null;
useSession.subscribe((state) => {
  const id = state.profile?.id ?? null;
  if (id === lastProfileId) return;
  lastProfileId = id;
  useData.setState(EMPTY_USER_DATA);
});

// ---------------------------------------------------------------------------
// Hooks: load on first use
// ---------------------------------------------------------------------------

export function useServices() {
  const services = useData((s) => s.services);
  const state = useData((s) => s.servicesState);
  useEffect(() => {
    if (state === 'idle') void useData.getState().loadServices();
  }, [state]);
  return { services, state, retry: () => void useData.getState().loadServices() };
}

export function useVehicles() {
  const vehicles = useData((s) => s.vehicles);
  const state = useData((s) => s.vehiclesState);
  const profileId = useSession((s) => s.profile?.id);
  useEffect(() => {
    if (state === 'idle' && profileId) void useData.getState().loadVehicles();
  }, [state, profileId]);
  return { vehicles, state, retry: () => void useData.getState().loadVehicles() };
}

export function useBookings() {
  const bookings = useData((s) => s.bookings);
  const state = useData((s) => s.bookingsState);
  const profileId = useSession((s) => s.profile?.id);
  useEffect(() => {
    if (state === 'idle' && profileId) void useData.getState().loadBookings();
  }, [state, profileId]);
  return { bookings, state, retry: () => void useData.getState().loadBookings() };
}

export function useRequests() {
  const requests = useData((s) => s.requests);
  const state = useData((s) => s.requestsState);
  const profileId = useSession((s) => s.profile?.id);
  useEffect(() => {
    if (state === 'idle' && profileId) void useData.getState().loadRequests();
  }, [state, profileId]);
  return { requests, state, retry: () => void useData.getState().loadRequests() };
}

/** Releases local photo previews; kept here so screens never touch the adapter's internals. */
export const releasePhoto = (photo: CapturedPhoto) => platform.camera.release(photo);
