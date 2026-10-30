import { describe, expect, it } from 'vitest';
import {
  AIRPORT,
  SAMPLE_PLACES,
  defaultTrip,
  isAfterHours,
  quoteTrip,
  routeLabel,
  smallestFit,
  tripHours,
  tripProblem,
  withType,
  type TripDraft,
} from './trips';

const NOW = new Date('2026-11-01T12:00:00');
const draft = (patch: Partial<TripDraft> = {}): TripDraft => ({ ...defaultTrip(NOW), ...patch });
const sum = (q: ReturnType<typeof quoteTrip>) => q.lines.reduce((t, l) => t + l.amountCents, 0);

describe('quoteTrip', () => {
  it('charges hourly trips by the hour, with gratuity on the fare', () => {
    const q = quoteTrip(draft({ type: 'hourly', hours: 4, vehicleClass: 'suv' }));
    // 4 × $125 = $500, gratuity $100.
    expect(q.totalCents).toBe(60000);
    expect(q.depositCents).toBe(15000);
    expect(q.hours).toBe(4);
  });

  it('applies the vehicle minimum and says so', () => {
    const q = quoteTrip(draft({ type: 'hourly', hours: 2, vehicleClass: 'sprinter' }));
    expect(q.lines[0]!.amountCents).toBe(4 * 16500);
    expect(q.lines[0]!.detail).toMatch(/4-hour minimum/);
    expect(q.hours).toBe(4);
  });

  it('includes stops in an hourly booking at no charge', () => {
    const one = quoteTrip(draft({ stops: [] }));
    const many = quoteTrip(draft({ stops: SAMPLE_PLACES.slice(1, 5) }));
    expect(many.totalCents).toBe(one.totalCents);
  });

  it('prices airport transfers flat, plus stops, doubled for a return', () => {
    const base = draft({ type: 'airport', vehicleClass: 'sedan', stops: [], extras: [], time: '14:00' });
    expect(quoteTrip(base).totalCents).toBe(11500 + 2300);
    const withStop = quoteTrip({ ...base, stops: [SAMPLE_PLACES[1]!] });
    expect(withStop.totalCents).toBe((11500 + 2000) * 1.2);
    const both = quoteTrip({ ...base, stops: [SAMPLE_PLACES[1]!], returnTrip: true });
    expect(both.totalCents).toBe((11500 + 2000) * 2 * 1.2);
  });

  it('adds extras, child seats and the after-hours fee without gratuity on them', () => {
    const base = draft({ type: 'p2p', vehicleClass: 'sedan', stops: [], time: '23:30' });
    const q = quoteTrip({ ...base, extras: ['champagne'], childSeats: 2 });
    expect(q.totalCents).toBe(8500 + 1700 + 6500 + 3000 + 2500);
  });

  it('itemises every cent of the total', () => {
    const q = quoteTrip(draft({ extras: ['meet', 'decor'], childSeats: 1, time: '04:00' }));
    expect(sum(q)).toBe(q.totalCents);
  });
});

describe('trip rules', () => {
  it('picks the smallest vehicle that seats the party and its bags', () => {
    expect(smallestFit(2, 1)).toBe('sedan');
    expect(smallestFit(3, 4)).toBe('suv');
    expect(smallestFit(7, 0)).toBe('sprinter');
    expect(smallestFit(20, 0)).toBe('sprinter');
  });

  it('marks pickups from 11 PM to before 5 AM as after hours', () => {
    expect(isAfterHours('23:00')).toBe(true);
    expect(isAfterHours('04:59')).toBe(true);
    expect(isAfterHours('05:00')).toBe(false);
    expect(isAfterHours('22:59')).toBe(false);
  });

  it('commits the vehicle for longer on a return trip', () => {
    const one = draft({ type: 'p2p', stops: [] });
    expect(tripHours({ ...one, returnTrip: true })).toBe(tripHours(one) * 2);
  });

  it('refuses a past time, a missing flight, and a party that does not fit', () => {
    expect(tripProblem(draft(), NOW)).toBeNull();
    expect(tripProblem(draft({ date: '2026-10-31' }), NOW)).toMatch(/future/);
    expect(tripProblem(withType(draft(), 'airport'), NOW)).toMatch(/flight/);
    expect(tripProblem(draft({ passengers: 5, vehicleClass: 'sedan' }), NOW)).toMatch(/too small/);
  });

  it('reshapes the route when the trip type changes', () => {
    const airport = withType(draft(), 'airport');
    expect(airport.pickup).toBe(AIRPORT);
    expect(airport.extras).toContain('meet');
    const back = withType(airport, 'p2p');
    expect(back.pickup.id).not.toBe(AIRPORT.id);
    expect(back.extras).not.toContain('meet');
    expect(back.dropoff.id).not.toBe(back.pickup.id);
  });

  it('labels the route in order', () => {
    const d = draft();
    expect(routeLabel(d)).toBe('Windsor Court Hotel → Commander’s Palace → Windsor Court Hotel');
  });
});
