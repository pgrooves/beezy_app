/**
 * Pricing engine.
 *
 * The single most valuable piece of logic in the app, and entirely
 * backend-independent: given a vehicle, a condition and some services, it
 * produces the quote the customer sees. Pure functions, no I/O, fully tested.
 *
 * Two rules govern the design:
 *
 *   1. The app infers, the customer confirms. Size is derived from the vehicle
 *      they already picked and stated as a fact they can correct — never asked
 *      as a question.
 *   2. Multiplicative maths, additive presentation. Nobody wants to read
 *      "x1.35"; everybody understands "+$70 because it's a big truck". So the
 *      engine computes with multipliers and emits line items in dollars.
 */
import type {
  BodyType,
  ConditionTier,
  LineItem,
  Quote,
  Service,
  SizeClass,
  SurchargeCode,
  Vehicle,
} from './types';

// ---------------------------------------------------------------------------
// Size
// ---------------------------------------------------------------------------

const BODY_TYPE_SIZE: Record<BodyType, SizeClass> = {
  coupe: 'compact',
  sedan: 'standard',
  compact_suv: 'standard',
  mid_suv: 'mid',
  large_suv: 'large',
  truck: 'large',
  van: 'xl',
  xl: 'xl',
};

export const SIZE_MULTIPLIER: Record<SizeClass, number> = {
  compact: 0.9,
  standard: 1.0,
  mid: 1.15,
  large: 1.35,
  xl: 1.55,
};

export const SIZE_LABEL: Record<SizeClass, string> = {
  compact: 'Compact',
  standard: 'Sedan',
  mid: 'Mid SUV',
  large: 'Large SUV / Truck',
  xl: 'XL / Van',
};

/**
 * A third row forces the large band whatever the body style suggests. This is
 * exactly where solo detailers lose money: a three-row Highlander is priced
 * like a mid SUV by eye and takes as long as a Tahoe.
 */
export function sizeClassFor(vehicle: Pick<Vehicle, 'bodyType' | 'thirdRow'>): SizeClass {
  const base = BODY_TYPE_SIZE[vehicle.bodyType];
  if (!vehicle.thirdRow) return base;
  return base === 'xl' ? 'xl' : 'large';
}

// ---------------------------------------------------------------------------
// Condition
// ---------------------------------------------------------------------------

export const CONDITION_MULTIPLIER: Record<ConditionTier, number> = {
  light: 1.0,
  moderate: 1.15,
  heavy: 1.35,
  extreme: 1.6,
};

/** Customer-facing copy. Describes a life, not a grade. */
export const CONDITION_COPY: Record<ConditionTier, { label: string; detail: string }> = {
  light: { label: 'Light', detail: 'Kept up. Light dust, washed recently.' },
  moderate: { label: 'Moderate', detail: 'Normal life. Some crumbs, a few weeks.' },
  heavy: { label: 'Heavy', detail: "It's been a season. Kids, stains, brake dust." },
  extreme: { label: 'Extreme', detail: 'Pet hair, sand, spills, smoke.' },
};

/** Extreme is an estimate Beezy confirms on site rather than a firm price. */
export const REVIEW_TIER: ConditionTier = 'extreme';

// ---------------------------------------------------------------------------
// Surcharges — additive, so the arithmetic stays legible
// ---------------------------------------------------------------------------

export const SURCHARGES: Record<SurchargeCode, { label: string; detail: string; cents: number }> = {
  pet_hair: {
    label: 'Pet hair extraction',
    detail: 'Embedded hair needs a different tool and a lot more time.',
    cents: 6000,
  },
  gulf_sand: {
    label: 'Sand extraction',
    detail: 'Gulf sand works its way into everything.',
    cents: 4500,
  },
  biohazard: {
    label: 'Deep remediation',
    detail: 'Mould, smoke or spills. Beezy quotes this one directly.',
    cents: 0,
  },
};

/** Travel beyond the included radius. */
export const INCLUDED_RADIUS_MILES = 20;
export const PER_MILE_CENTS = 175;

/** Percentage of the estimate taken at booking. The anti-no-show lever. */
export const DEPOSIT_PERCENT = 20;

// ---------------------------------------------------------------------------
// Quote
// ---------------------------------------------------------------------------

export interface QuoteInput {
  services: Service[];
  vehicle: Pick<Vehicle, 'bodyType' | 'thirdRow' | 'make' | 'model'>;
  condition: ConditionTier;
  surcharges?: SurchargeCode[];
  /** Distance from base, for the travel line. */
  travelMiles?: number;
  /** Subscription discount on add-ons, as a percentage. */
  addonDiscountPercent?: number;
}

/** Round to whole dollars — cents on a quote read as false precision. */
const toWholeDollars = (cents: number) => Math.round(cents / 100) * 100;

export function buildQuote(input: QuoteInput): Quote {
  const { services, vehicle, condition, surcharges = [], travelMiles = 0 } = input;
  const lines: LineItem[] = [];

  const size = sizeClassFor(vehicle);
  const sizeMultiplier = SIZE_MULTIPLIER[size];
  const conditionMultiplier = CONDITION_MULTIPLIER[condition];

  const base = services.reduce((sum, s) => sum + s.basePriceCents, 0);
  for (const service of services) {
    lines.push({ label: service.name, amountCents: service.basePriceCents });
  }

  // Presented as a positive adjustment against the base, so the customer reads
  // "+$70 for a big truck" rather than a multiplier they have to interpret.
  const sizeDelta = toWholeDollars(base * sizeMultiplier - base);
  if (sizeDelta !== 0) {
    lines.push({
      label: `${vehicle.make} ${vehicle.model}`,
      detail: SIZE_LABEL[size],
      amountCents: sizeDelta,
    });
  }

  const afterSize = base + sizeDelta;
  const conditionDelta = toWholeDollars(afterSize * conditionMultiplier - afterSize);
  if (conditionDelta !== 0) {
    lines.push({
      label: `${CONDITION_COPY[condition].label} condition`,
      detail: CONDITION_COPY[condition].detail,
      amountCents: conditionDelta,
    });
  }

  for (const code of surcharges) {
    const surcharge = SURCHARGES[code];
    // A zero-cost surcharge is a quote-on-site item; showing "+$0" would imply
    // it is free, so it is carried as a review flag instead of a line.
    if (surcharge.cents > 0) {
      lines.push({
        label: surcharge.label,
        detail: surcharge.detail,
        amountCents: surcharge.cents,
      });
    }
  }

  const extraMiles = Math.max(0, Math.ceil(travelMiles - INCLUDED_RADIUS_MILES));
  if (extraMiles > 0) {
    lines.push({
      label: 'Travel',
      detail: `${extraMiles} mi beyond the ${INCLUDED_RADIUS_MILES} mi service area`,
      amountCents: extraMiles * PER_MILE_CENTS,
    });
  }

  const subtotalCents = lines.reduce((sum, l) => sum + l.amountCents, 0);

  const estimatedMinutes = Math.round(
    services.reduce((sum, s) => sum + s.baseDurationMinutes, 0) *
      sizeMultiplier *
      conditionMultiplier,
  );

  const needsReview =
    condition === REVIEW_TIER || surcharges.includes('biohazard');

  return {
    lines,
    subtotalCents,
    // Never ask for a deposit on a price that is still an estimate.
    depositCents: needsReview ? 0 : toWholeDollars((subtotalCents * DEPOSIT_PERCENT) / 100),
    needsReview,
    estimatedMinutes,
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Whole dollars. Prices in this business are never $139.99. */
export function formatMoney(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

/** Signed, for adjustment rows. */
export function formatDelta(cents: number): string {
  const sign = cents < 0 ? '−' : '+';
  return `${sign} ${formatMoney(Math.abs(cents))}`;
}
