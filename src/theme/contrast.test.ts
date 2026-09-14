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

  /**
   * Every text token against every ground it is actually set on — including
   * `surfaceAlt`, which is the tightest of the three and was the one nothing
   * checked.
   */
  const TEXT_TOKENS: [string, string][] = [
    ['ink', c.ink],
    ['inkMuted', c.inkMuted],
    ['inkSubtle', c.inkSubtle],
    ['accentText', c.accentText],
    ['successText', c.successText],
    ['warningText', c.warningText],
    ['dangerText', c.dangerText],
  ];
  const GROUNDS: [string, string][] = [
    ['bg', c.bg],
    ['surface', c.surface],
    ['surfaceAlt', c.surfaceAlt],
  ];

  it.each(
    TEXT_TOKENS.flatMap(([name, fg]) =>
      GROUNDS.map(([ground, bg]) => [`${name} on ${ground}`, fg, bg] as const),
    ),
  )('%s meets AA for body text', (_label, fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each([
    ['onBrand on brand', c.onBrand, c.brand],
    ['onAccent on accent', c.onAccent, c.accent],
  ])('%s meets AA for body text', (_label, fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  /*
   * `inkSubtle` used to be asserted at AA_LARGE only, on the reasoning that it
   * was for large text. Nothing ever set it large: it renders at 12–13px in
   * `.eyebrow`, ListRow details, Stat captions and DemoNote. The token measured
   * 3.13:1 and the suite stayed green while Lighthouse failed the build over
   * exactly those elements. A threshold is only as good as the claim it
   * encodes, so AA_LARGE now guards the one thing genuinely set large.
   */
  it('display-scale text clears AA large at minimum', () => {
    expect(ratio(c.inkMuted, c.bg)).toBeGreaterThanOrEqual(AA_LARGE);
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

describe('status colours follow the same fill/text split', () => {
  // A status Chip sets its label at 10px. Pointing it at the bright fill is
  // the same bug as pointing gold lettering at `accent`, and it shipped:
  // green measured 2.21:1 on white, amber 2.05:1, red 3.42:1.
  it.each(['success', 'warning', 'danger'] as const)(
    'the %s fill is not safe as light-mode text, which is why its *Text pair exists',
    (name) => {
      expect(ratio(colour.light[name], colour.light.surface)).toBeLessThan(AA_TEXT);
      expect(colour.light[`${name}Text`]).not.toBe(colour.light[name]);
    },
  );

  it('dark mode shares one value per hue, as the accent does', () => {
    for (const name of ['success', 'warning', 'danger'] as const) {
      expect(ratio(colour.dark[name], colour.dark.surface)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(colour.dark[`${name}Text`]).toBe(colour.dark[name]);
    }
  });
});
