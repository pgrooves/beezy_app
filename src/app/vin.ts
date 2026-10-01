import { VPIC_DECODE_URL, parseVpic, type DecodedVin } from '../core/vin';

/**
 * Decodes a VIN with NHTSA's public vPIC service. Optional by design: any
 * failure — offline, slow, a VIN it does not know — resolves null and the
 * customer types the details instead. Only the VIN is sent.
 */
export async function decodeVin(vin: string): Promise<DecodedVin | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(VPIC_DECODE_URL(vin), { signal: controller.signal });
    if (!response.ok) return null;
    return parseVpic(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
