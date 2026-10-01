import { describe, expect, it } from 'vitest';
import { VPIC_DECODE_URL, parseVpic } from './vin';

const vpic = (fields: Record<string, string>) => ({ Results: [{ ErrorCode: '0', ...fields }] });

describe('parseVpic', () => {
  it('reads year, make and model, and tidies capitals', () => {
    expect(parseVpic(vpic({ ModelYear: '2023', Make: 'PORSCHE', Model: 'Macan', BodyClass: 'Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)', SeatRows: '2' }))).toEqual({
      year: 2023,
      make: 'Porsche',
      model: 'Macan',
      bodyType: 'mid_suv',
    });
  });

  it('a third seat row means a full-size SUV and the third-row flag', () => {
    const d = parseVpic(vpic({ Make: 'CHEVROLET', Model: 'Tahoe', BodyClass: 'Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)', SeatRows: '3' }));
    expect(d?.bodyType).toBe('large_suv');
    expect(d?.thirdRow).toBe(true);
  });

  it('maps the common body classes', () => {
    const body = (BodyClass: string) => parseVpic(vpic({ Make: 'X', BodyClass }))?.bodyType;
    expect(body('Pickup')).toBe('truck');
    expect(body('Sedan/Saloon')).toBe('sedan');
    expect(body('Coupe')).toBe('coupe');
    expect(body('Minivan')).toBe('van');
    expect(body('Something new')).toBeUndefined();
  });

  it('treats a VIN that decoded to no make as a miss', () => {
    expect(parseVpic(vpic({ Make: '', ErrorCode: '7' }))).toBeNull();
    expect(parseVpic({})).toBeNull();
  });

  it('only ever sends the VIN', () => {
    expect(VPIC_DECODE_URL(' wp1ab2a57plb12345 ')).toBe(
      'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/WP1AB2A57PLB12345?format=json',
    );
  });
});
