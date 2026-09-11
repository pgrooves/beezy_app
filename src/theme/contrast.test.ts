import { describe, expect, it } from 'vitest';
import { colour } from './tokens';

/**
 * WCAG AA contrast is a stated non-negotiable (docs/DESIGN_SYSTEM.md), and the
 * champagne accent sits close enough to the line that a well-meaning tweak can
 * quietly break it. These assertions fail the build instead.
 */

function luminance(hex: string): number {
  const channels = hex.replace('#', '').match(/\w\w/g);
  if (!channels) throw new Error(`not a hex colour: ${hex}`);
  const [r, g, b] = channels.map((pair) => {
    const v = parseInt(pair, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const AA_TEXT = 4.5;
const AA_LARGE = 3;
/** WCAG 1.4.11: non-text UI and focus indicators. */
const AA_NON_TEXT = 3;

describe.each(['light', 'dark'] as const)('%s scheme', (scheme) => {
  const c = colour[scheme];

  it.each([
    ['ink on bg', c.ink, c.bg],
    ['ink on surface', c.ink, c.surface],
    ['inkMuted on bg', c.inkMuted, c.bg],
    ['inkMuted on surface', c.inkMuted, c.surface],
    ['accentText on bg', c.accentText, c.bg],
    ['accentText on surface', c.accentText, c.surface],
    ['onBrand on brand', c.onBrand, c.brand],
    ['onAccent on accent', c.onAccent, c.accent],
  ])('%s meets AA for body text', (_label, fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('inkSubtle meets AA for large text at minimum', () => {
    expect(ratio(c.inkSubtle, c.bg)).toBeGreaterThanOrEqual(AA_LARGE);
  });

  it('the focus ring is distinguishable from the background', () => {
    expect(ratio(c.accentText, c.bg)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it('hairlines are visible against their surfaces', () => {
    // Not a WCAG threshold — a sanity floor so a hairline never vanishes.
    expect(ratio(c.hairline, c.surface)).toBeGreaterThan(1.1);
  });
});

describe('accent discipline', () => {
  it('the fill accent is NOT safe as light-mode text, which is why accentText exists', () => {
    // Guards the rule rather than the value: if someone "simplifies" by
    // pointing accentText at accent, this fails and explains why.
    expect(ratio(colour.light.accent, colour.light.bg)).toBeLessThan(AA_TEXT);
    expect(colour.light.accentText).not.toBe(colour.light.accent);
  });

  it('dark mode can share one value, because the champagne clears AA there', () => {
    expect(ratio(colour.dark.accent, colour.dark.bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
