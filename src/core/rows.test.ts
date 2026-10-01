import { describe, expect, it } from 'vitest';
import {
  bookingFromRow,
  bookingRequestToRow,
  canCancel,
  nextBooking,
  pastBookings,
  serviceFromRow,
  validateVehicle,
  vehicleInputToRow,
  vehicleLabel,
  type BookingRow,
  type VehicleInput,
} from './rows';
import { buildQuote } from './pricing';
import { SERVICES } from './fixtures';
import type { Booking } from './types';

const bookingRow: BookingRow = {
  id: 'b1',
  client_id: 'u1',
  vehicle_id: null,
  vehicle_label: '2023 Porsche Macan',
  service_ids: ['s1'],
  condition: 'moderate',
  surcharges: ['pet_hair', 'not_a_code'],
  address_line1: '1428 Napoleon Ave',
  address_line2: null,
  city: 'New Orleans',
  state: 'LA',
  postal_code: '70115',
  gate_code: null,
  parking_notes: null,
  covered: false,
  latitude: null,
  longitude: null,
  scheduled_at: '2030-01-01T15:00:00Z',
  duration_minutes: 180,
  status: 'requested',
  subtotal_cents: 15000,
  deposit_cents: 3000,
  quote_lines: null,
  needs_review: false,
  final_cents: null,
  notes: null,
  created_at: '2029-12-01T00:00:00Z',
};

describe('bookingFromRow', () => {
  it('keeps the frozen vehicle label when the car is gone', () => {
    const b = bookingFromRow(bookingRow);
    expect(b.vehicleId).toBe('');
    expect(b.vehicleLabel).toBe('2023 Porsche Macan');
  });

  it('drops surcharge codes the app does not know', () => {
    expect(bookingFromRow(bookingRow).surcharges).toEqual(['pet_hair']);
  });

  it('reads the subtotal as the total', () => {
    expect(bookingFromRow(bookingRow).totalCents).toBe(15000);
  });
});

describe('bookingRequestToRow', () => {
  it('sends the quote as priced and never a status', () => {
    const vehicle = { id: 'v1', year: 2023, make: 'Porsche', model: 'Macan', bodyType: 'mid_suv' as const, thirdRow: false };
    const quote = buildQuote({ services: [SERVICES[0]!], vehicle, condition: 'moderate' });
    const row = bookingRequestToRow({
      clientId: 'u1',
      vehicle,
      serviceIds: ['s1'],
      condition: 'moderate',
      surcharges: [],
      address: { line1: ' 1428 Napoleon Ave ', city: 'New Orleans', state: 'LA', postalCode: '70115', covered: false, gateCode: '  ' },
      scheduledAt: '2030-01-01T15:00:00Z',
      quote,
    });
    expect(row).not.toHaveProperty('status');
    expect(row).not.toHaveProperty('final_cents');
    expect(row.subtotal_cents).toBe(quote.subtotalCents);
    expect(row.duration_minutes).toBe(quote.estimatedMinutes);
    expect(row.vehicle_label).toBe('2023 Porsche Macan');
    expect(row.address_line1).toBe('1428 Napoleon Ave');
    expect(row.gate_code).toBeNull();
  });
});

describe('reading bookings', () => {
  const at = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
  const b = (id: string, days: number, status: Booking['status']): Booking => ({
    ...bookingFromRow(bookingRow),
    id,
    scheduledAt: at(days),
    status,
  });
  const list = [b('past', -10, 'paid'), b('older', -40, 'complete'), b('soon', 2, 'confirmed'), b('later', 9, 'requested'), b('gone', 1, 'cancelled')];

  it('next is the soonest live booking, ignoring cancelled', () => {
    expect(nextBooking(list)?.id).toBe('soon');
  });

  it('past is completed work, newest first', () => {
    expect(pastBookings(list).map((x) => x.id)).toEqual(['past', 'older']);
  });

  it('a booking can be cancelled until the van is on its way', () => {
    expect(canCancel(b('x', 1, 'requested'))).toBe(true);
    expect(canCancel(b('x', 1, 'confirmed'))).toBe(true);
    expect(canCancel(b('x', 1, 'en_route'))).toBe(false);
  });
});

describe('vehicles', () => {
  const input: VehicleInput = { year: 2023, make: ' Porsche ', model: 'Macan', colour: '', bodyType: 'mid_suv', thirdRow: false, vin: 'wp1ab2a57plb12345', plate: ' nola 22 ' };

  it('normalises for storage', () => {
    expect(vehicleInputToRow(input)).toMatchObject({ make: 'Porsche', colour: null, vin: 'WP1AB2A57PLB12345', plate: 'NOLA 22' });
  });

  it('validates what a person can fix', () => {
    expect(validateVehicle(input)).toEqual([]);
    expect(validateVehicle({ ...input, make: '' })[0]).toMatch(/make/);
    expect(validateVehicle({ ...input, vin: 'WP1AB2A57PLB1234O' })[0]).toMatch(/VIN/);
    expect(validateVehicle({ ...input, year: 1850 })[0]).toMatch(/year/);
  });

  it('labels without a missing year', () => {
    expect(vehicleLabel({ year: 0, make: 'Ford', model: 'F-150' })).toBe('Ford F-150');
  });
});

describe('serviceFromRow', () => {
  it('maps the menu copy moved into the database by 0005', () => {
    const s = serviceFromRow({
      id: 's1', slug: 'express-wash', name: 'Express Wash', summary: 'x', base_price_cents: 10000,
      base_duration_minutes: 120, is_addon: false, is_premium: false, image_path: null, includes: null,
    });
    expect(s.includes).toEqual([]);
    expect(s.imageUrl).toBeUndefined();
  });
});
