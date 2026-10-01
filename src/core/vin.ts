/**
 * VIN decoding against NHTSA's vPIC service — public, no key, no account
 * (DATA_MODEL.md: the VIN is the only thing sent).
 *
 * This file only builds the request URL and reads the answer; the fetch
 * lives in the app layer. vPIC's BodyClass strings are long and inconsistent,
 * so the body type is a best guess the customer confirms on the form.
 */
import type { BodyType } from './types';

export const VPIC_DECODE_URL = (vin: string) =>
  `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin.trim().toUpperCase())}?format=json`;

export interface DecodedVin {
  year?: number;
  make?: string;
  model?: string;
  bodyType?: BodyType;
  thirdRow?: boolean;
}

/** vPIC writes makes in capitals ("PORSCHE"); people do not. */
function titleCase(value: string): string {
  if (/[a-z]/.test(value)) return value; // already mixed case, leave it
  return value.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

function bodyTypeFrom(bodyClass: string, seatRows: number): BodyType | undefined {
  const b = bodyClass.toLowerCase();
  if (!b) return undefined;
  if (b.includes('pickup')) return 'truck';
  if (b.includes('van') && !b.includes('minivan')) return 'van';
  if (b.includes('minivan')) return 'van';
  if (b.includes('coupe') || b.includes('convertible') || b.includes('roadster')) return 'coupe';
  if (b.includes('sport utility') || b.includes('suv') || b.includes('crossover') || b.includes('cuv')) {
    return seatRows >= 3 ? 'large_suv' : 'mid_suv';
  }
  if (b.includes('sedan') || b.includes('hatchback') || b.includes('wagon') || b.includes('saloon')) {
    return 'sedan';
  }
  return undefined;
}

/**
 * Reads vPIC's DecodeVinValues response. Returns null when the VIN did not
 * decode to at least a make — vPIC answers 200 with an error code for a bad
 * VIN, so status alone means nothing.
 */
export function parseVpic(body: unknown): DecodedVin | null {
  const result = (body as { Results?: Record<string, string>[] })?.Results?.[0];
  if (!result) return null;
  const make = (result.Make ?? '').trim();
  if (!make) return null;
  const year = Number.parseInt(result.ModelYear ?? '', 10);
  const seatRows = Number.parseInt(result.SeatRows ?? '', 10) || 0;
  const decoded: DecodedVin = {
    make: titleCase(make),
    model: (result.Model ?? '').trim() || undefined,
    year: Number.isFinite(year) ? year : undefined,
    bodyType: bodyTypeFrom(result.BodyClass ?? '', seatRows),
  };
  if (seatRows >= 3) decoded.thirdRow = true;
  return decoded;
}
