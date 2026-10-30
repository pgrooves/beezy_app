import { describe, expect, it } from 'vitest';
import { LINES, LINE_ORDER, isLine, lineForPath, rememberedLine } from './lines';

describe('business lines', () => {
  it('lists every line once, on the front door', () => {
    expect([...LINE_ORDER].sort()).toEqual(Object.keys(LINES).sort());
  });

  it('accepts only known line ids', () => {
    expect(isLine('detailing')).toBe(true);
    expect(isLine('chauffeur')).toBe(true);
    expect(isLine('Detailing')).toBe(false);
    expect(isLine(null)).toBe(false);
  });

  it('reopens a remembered live line', () => {
    expect(rememberedLine('detailing')).toBe('detailing');
  });

  it('never reopens a placeholder line or a garbled value', () => {
    // Chauffeur is a placeholder until its screens exist; remembering it
    // would land the customer on "coming soon" at every launch.
    expect(LINES.chauffeur.live).toBe(false);
    expect(rememberedLine('chauffeur')).toBeNull();
    expect(rememberedLine('limo')).toBeNull();
    expect(rememberedLine(null)).toBeNull();
  });
});

describe('lineForPath', () => {
  it('treats the door and shared screens as belonging to neither line', () => {
    for (const path of ['/', '/choose', '/admin', '/admin/clients', '/sign-in', '/settings/appearance']) {
      expect(lineForPath(path)).toBeNull();
    }
  });

  it('puts everything under /chauffeur in Chauffeur', () => {
    expect(lineForPath('/chauffeur')).toBe('chauffeur');
    expect(lineForPath('/chauffeur/build')).toBe('chauffeur');
    expect(lineForPath('/chauffeurs')).toBe('detailing');
  });

  it('keeps the original detailing paths in Detailing', () => {
    for (const path of ['/detailing', '/book/service', '/garage', '/gallery', '/booking/bk-1', '/plan']) {
      expect(lineForPath(path)).toBe('detailing');
    }
  });
});
