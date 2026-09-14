import { describe, expect, it } from 'vitest';
import {
  CONDITION_MULTIPLIER,
  SIZE_MULTIPLIER,
  buildQuote,
  formatMoney,
  sizeClassFor,
} from './pricing';
import { SERVICES, serviceBySlug } from './fixtures';
import type { Service, Vehicle } from './types';

/**
 * The pricing engine decides what Beezy gets paid, so it is tested against the
 * real menu rather than invented numbers. Anything that changes a customer's
 * quote should have to change a test first.
 */

const express = serviceBySlug('express-wash') as Service;
const ceramic = serviceBySlug('ceramic-coating') as Service;

const vehicle = (over: Partial<Vehicle> = {}): Vehicle => ({
  id: 'v',
  ownerId: 'o',
  year: 2024,
  make: 'Honda',
  model: 'Accord',
  colour: 'Silver',
  bodyType: 'sedan',
  thirdRow: false,
  ...over,
});

describe('size class', () => {
  it('reads the band off the body type', () => {
    expect(sizeClassFor(vehicle({ bodyType: 'coupe' }))).toBe('compact');
    expect(sizeClassFor(vehicle({ bodyType: 'sedan' }))).toBe('standard');
    expect(sizeClassFor(vehicle({ bodyType: 'mid_suv' }))).toBe('mid');
    expect(sizeClassFor(vehicle({ bodyType: 'large_suv' }))).toBe('large');
    expect(sizeClassFor(vehicle({ bodyType: 'van' }))).toBe('xl');
  });

  it('promotes a third row to the large band', () => {
    // The Highlander problem: priced like a mid SUV by eye, takes as long as
    // a Tahoe. This is where solo detailers lose money.
    expect(sizeClassFor(vehicle({ bodyType: 'mid_suv', thirdRow: true }))).toBe('large');
    expect(sizeClassFor(vehicle({ bodyType: 'sedan', thirdRow: true }))).toBe('large');
  });

  it('does not demote an XL vehicle', () => {
    expect(sizeClassFor(vehicle({ bodyType: 'van', thirdRow: true }))).toBe('xl');
  });
});

describe('quote', () => {
  it('charges the floor price for a standard sedan in light condition', () => {
    const quote = buildQuote({ services: [express], vehicle: vehicle(), condition: 'light' });
    expect(quote.subtotalCents).toBe(express.basePriceCents);
    expect(quote.lines).toHaveLength(1);
  });

  it('adds size and condition as separate, positive line items', () => {
    // Multiplicative maths, additive presentation: nobody reads "x1.35".
    const quote = buildQuote({
      services: [express],
      vehicle: vehicle({ bodyType: 'large_suv', make: 'Chevrolet', model: 'Tahoe' }),
      condition: 'heavy',
    });
    const labels = quote.lines.map((l) => l.label);
    expect(labels).toContain('Chevrolet Tahoe');
    expect(labels).toContain('Heavy condition');
    for (const line of quote.lines) expect(line.amountCents).toBeGreaterThan(0);
  });

  it('compounds size and condition rather than adding them', () => {
    const base = express.basePriceCents;
    const quote = buildQuote({
      services: [express],
      vehicle: vehicle({ bodyType: 'large_suv' }),
      condition: 'heavy',
    });
    const expected = base * SIZE_MULTIPLIER.large * CONDITION_MULTIPLIER.heavy;
    // Rounded to whole dollars at each step, so allow a couple of dollars.
    expect(Math.abs(quote.subtotalCents - expected)).toBeLessThanOrEqual(200);
  });

  it('discounts a compact below the floor price', () => {
    const quote = buildQuote({
      services: [express],
      vehicle: vehicle({ bodyType: 'coupe' }),
      condition: 'light',
    });
    expect(quote.subtotalCents).toBeLessThan(express.basePriceCents);
  });

  it('adds surcharges as flat amounts, not multipliers', () => {
    const without = buildQuote({ services: [express], vehicle: vehicle(), condition: 'moderate' });
    const withPet = buildQuote({
      services: [express],
      vehicle: vehicle(),
      condition: 'moderate',
      surcharges: ['pet_hair'],
    });
    expect(withPet.subtotalCents - without.subtotalCents).toBe(6000);
  });

  it('charges travel only beyond the included radius', () => {
    const inside = buildQuote({
      services: [express],
      vehicle: vehicle(),
      condition: 'light',
      travelMiles: 18,
    });
    expect(inside.lines.some((l) => l.label === 'Travel')).toBe(false);

    const outside = buildQuote({
      services: [express],
      vehicle: vehicle(),
      condition: 'light',
      travelMiles: 30,
    });
    const travel = outside.lines.find((l) => l.label === 'Travel');
    expect(travel?.amountCents).toBe(10 * 175);
  });

  it('scales duration with size and condition, not just price', () => {
    // A slot the day cannot physically support must never be offered, so
    // duration has to move with the same factors the price does.
    const light = buildQuote({ services: [express], vehicle: vehicle(), condition: 'light' });
    const heavy = buildQuote({
      services: [express],
      vehicle: vehicle({ bodyType: 'large_suv' }),
      condition: 'heavy',
    });
    expect(heavy.estimatedMinutes).toBeGreaterThan(light.estimatedMinutes);
  });

  it('takes no deposit on a quote that is still an estimate', () => {
    const quote = buildQuote({ services: [express], vehicle: vehicle(), condition: 'extreme' });
    expect(quote.needsReview).toBe(true);
    expect(quote.depositCents).toBe(0);
  });

  it('takes a deposit on a firm quote', () => {
    const quote = buildQuote({ services: [express], vehicle: vehicle(), condition: 'moderate' });
    expect(quote.needsReview).toBe(false);
    expect(quote.depositCents).toBeGreaterThan(0);
    expect(quote.depositCents).toBeLessThan(quote.subtotalCents);
  });

  it('flags biohazard for a human quote instead of inventing a price', () => {
    const quote = buildQuote({
      services: [express],
      vehicle: vehicle(),
      condition: 'moderate',
      surcharges: ['biohazard'],
    });
    expect(quote.needsReview).toBe(true);
    // A "+$0" line would read as free.
    expect(quote.lines.some((l) => l.label === 'Deep remediation')).toBe(false);
  });

  it('stacks add-ons onto the base service', () => {
    const quote = buildQuote({ services: [express, ceramic], vehicle: vehicle(), condition: 'light' });
    expect(quote.subtotalCents).toBe(express.basePriceCents + ceramic.basePriceCents);
  });

  it('prices the worst realistic job sensibly', () => {
    // Filthy Sprinter with a dog: should be expensive, because it is a day's
    // work — but not absurd.
    const quote = buildQuote({
      services: [express],
      vehicle: vehicle({ bodyType: 'van' }),
      condition: 'extreme',
      surcharges: ['pet_hair'],
    });
    expect(quote.subtotalCents).toBeGreaterThan(25000);
    expect(quote.subtotalCents).toBeLessThan(40000);
  });
});

describe('formatting', () => {
  it('shows whole dollars without cents', () => {
    expect(formatMoney(10000)).toBe('$100');
    expect(formatMoney(87900)).toBe('$879');
  });

  it('keeps cents only when they exist', () => {
    expect(formatMoney(10050)).toBe('$100.50');
  });

  it('groups thousands', () => {
    expect(formatMoney(123400)).toBe('$1,234');
  });
});

describe('the seeded menu', () => {
  it('matches the prices published on beezynola.com', () => {
    const expected: Record<string, number> = {
      'express-wash': 10000,
      'luxe-wash': 14000,
      'beezy-wash': 20000,
      'clay-bar': 39900,
      'headlight-restore': 9900,
      'ceramic-coating': 87900,
    };
    for (const [slug, cents] of Object.entries(expected)) {
      expect(serviceBySlug(slug)?.basePriceCents, slug).toBe(cents);
    }
  });

  it('gives every service a duration, so the scheduler can place it', () => {
    for (const service of SERVICES) {
      expect(service.baseDurationMinutes, service.slug).toBeGreaterThan(0);
    }
  });
});
