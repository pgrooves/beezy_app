/**
 * The design system's single source of truth.
 *
 * Plain data, no browser APIs, no framework imports — so this file ports to
 * React Native unchanged. `npm run tokens` generates src/theme/tokens.css from
 * it; Tailwind reads that generated CSS. Never hand-edit the .css, and never
 * hardcode a hex value in a component.
 */

export const colour = {
  light: {
    bg: '#FAFAF9',
    surface: '#FFFFFF',
    /** Raised surface: cards on top of cards, sheet headers. */
    surfaceAlt: '#F4F4F3',
    ink: '#111111',
    /** Secondary copy: captions, metadata, inactive tabs. */
    inkMuted: '#6B6B6B',
    /**
     * Tertiary copy: eyebrow labels, row details, stat captions.
     *
     * It was `#8E8E8E` on the strength of a comment claiming AA "at 14px+",
     * which was wrong twice over — 3.13:1 is below AA at *any* size, and every
     * call site renders it at 12–13px, nowhere near WCAG's large-text floor of
     * 24px. Lighthouse failed the build over it.
     *
     * Now 4.88:1 on `bg`, 5.10:1 on `surface`, 4.63:1 on `surfaceAlt`. That
     * leaves it very close to `inkMuted`, and there is no way around it: on a
     * near-white ground three visibly separated greys cannot all clear 4.5.
     * In light mode the tertiary tone is carried by size and weight instead.
     * Dark mode still has the headroom for a real ladder.
     */
    inkSubtle: '#6E6E6E',
    hairline: '#E5E5E5',
    /** The brand's button black, matching the existing Square checkout. */
    brand: '#212121',
    onBrand: '#FFFFFF',
    /**
     * Champagne. Fills only — tier badges, active nav pill, premium
     * highlights. It is 2.15:1 on `bg`, so it must never carry text.
     */
    accent: '#C9A961',
    onAccent: '#111111',
    /**
     * The same gold, darkened until it passes AA as text on every ground it
     * is set on: 4.89:1 on `bg`, 5.11:1 on `surface`, 4.64:1 on `surfaceAlt`.
     * That last one is why it is no longer `#8A6D2F` — the raised surface is
     * the tightest of the three and nothing used to check it, so the token sat
     * at 4.43:1 there. Use this for any gold *lettering*.
     */
    accentText: '#866A2D',
    /**
     * The active nav pill. A tint and an edge rather than a solid fill — over
     * glass, a heavier wash turns into a gold blob with no shape to it.
     */
    accentPill: 'rgba(201, 169, 97, 0.12)',
    accentPillEdge: 'rgba(201, 169, 97, 0.24)',
    /**
     * Status colours, fills only — the same split the two golds use, and for
     * the same reason. On white these measure 2.21:1, 2.05:1 and 3.42:1, so a
     * status Chip setting its label in one of them fails AA outright.
     */
    success: '#34C759',
    warning: '#FF9F0A',
    danger: '#FF453A',
    /** The same three hues darkened until they carry text on every ground:
     *  4.9:1 or better on `bg`, `surface` and `surfaceAlt` alike. Any status
     *  *lettering* uses these. */
    successText: '#1E7A38',
    warningText: '#966300',
    dangerText: '#D0281C',
    /** Liquid Glass: translucent fill behind backdrop-filter. */
    glass: 'rgba(255, 255, 255, 0.58)',
    /**
     * Sheets need more opacity than the nav capsule. The capsule is small and
     * content passing under it reads as depth; a full-height sheet at the same
     * value lets the page behind collide with its own labels.
     */
    glassSheet: 'rgba(250, 250, 249, 0.93)',
    /**
     * Sticky header. Nearly opaque on purpose: it carries the screen title,
     * and at the capsule's opacity a large heading scrolling underneath
     * ghosted straight through it. The blur and saturation still give it the
     * material's edge quality without costing legibility.
     */
    glassHeader: 'rgba(250, 250, 249, 0.96)',
    /** Opaque fallback when the OS asks to reduce transparency. */
    glassSolid: '#FFFFFF',
    /**
     * The four values below light the glass. They are deliberately unequal:
     * a pane has a lit top edge, a faint wash where the highlight rolls off,
     * a bounce along the underside, and almost nothing on the sides. Giving
     * the whole rim one bright value — which is what a plain 1px border does —
     * is what makes a glass surface read as moulded plastic.
     */
    /** Specular along the top rim. The brightest thing on the capsule. */
    glassRim: 'rgba(255, 255, 255, 0.78)',
    /** The rest of the rim. A whisper, not an outline. */
    glassRimFade: 'rgba(255, 255, 255, 0.22)',
    /** Reflection wash rolling off the top rim into the upper half. */
    glassSheen: 'rgba(255, 255, 255, 0.20)',
    /** Light bouncing up off the content passing underneath. */
    glassUnderlight: 'rgba(255, 255, 255, 0.45)',
    scrim: 'rgba(17, 17, 17, 0.42)',
  },
  dark: {
    bg: '#0A0A0A',
    surface: '#151515',
    surfaceAlt: '#1E1E1E',
    ink: '#F5F5F5',
    inkMuted: '#A1A1A1',
    // 4.29:1 on `surface` at the old #7A7A7A — the light theme was not the
    // only one failing, it was just the one Lighthouse audits. Now 5.37:1 on
    // `surface` and 4.83:1 on the raised surface, which is the tightest case.
    inkSubtle: '#8A8A8A',
    hairline: '#262626',
    brand: '#F5F5F5',
    onBrand: '#111111',
    accent: '#C9A961',
    onAccent: '#111111',
    // On near-black the bright champagne already reaches 8.8:1, so text and
    // fill share one value here.
    accentText: '#C9A961',
    // The pill needs slightly more presence on a dark ground to read at all.
    accentPill: 'rgba(201, 169, 97, 0.16)',
    accentPillEdge: 'rgba(201, 169, 97, 0.28)',
    success: '#34C759',
    warning: '#FF9F0A',
    danger: '#FF453A',
    // On near-black all three already clear AA as text (8.4:1, 9.0:1, 5.4:1),
    // so fill and lettering share one value — same as accentText.
    successText: '#34C759',
    warningText: '#FF9F0A',
    dangerText: '#FF453A',
    glass: 'rgba(21, 21, 21, 0.52)',
    glassSheet: 'rgba(16, 16, 16, 0.94)',
    glassHeader: 'rgba(10, 10, 10, 0.96)',
    glassSolid: '#151515',
    // Dark keeps the same relationships at a fraction of the amplitude: on a
    // near-black ground the light-mode values would frost the capsule white.
    glassRim: 'rgba(255, 255, 255, 0.26)',
    glassRimFade: 'rgba(255, 255, 255, 0.05)',
    glassSheen: 'rgba(255, 255, 255, 0.07)',
    glassUnderlight: 'rgba(255, 255, 255, 0.10)',
    scrim: 'rgba(0, 0, 0, 0.58)',
  },
} as const;

/** Browser theme-color, per scheme. Drives the iOS status bar in standalone. */
export const themeColour = {
  light: colour.light.bg,
  dark: colour.dark.bg,
} as const;

export const space = {
  /** Screen gutter. Everything full-width sits inside this. */
  gutter: 24,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  /** Cards. */
  card: 16,
  lg: 20,
  /** Sheets. */
  sheet: 28,
  /** Nav capsule, chips, pills. */
  full: 999,
} as const;

export const type = {
  /**
   * Display face. A light art-deco geometric, set against the Didone
   * wordmark rather than imitating it — the mark stays the ornamental
   * element and the headings get out of its way. See docs/DECISIONS.md#0016.
   */
  display: "'Josefin Sans', 'Futura', 'Century Gothic', sans-serif",
  /** UI and body. */
  body: "'Inter Tight', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  /** Prices, invoices, reporting. Tabular figures, always. */
  numeric: "'Inter Tight', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
} as const;

/** size / lineHeight / letterSpacing / weight, in px except tracking (em). */
export const textStyle = {
  /**
   * Mixed case, for headings that carry a sentence. Josefin runs small for
   * its point size, so these sit a little larger than a grotesque would.
   */
  displayLg: { size: 38, leading: 44, tracking: 0, weight: 300 },
  displayMd: { size: 30, leading: 36, tracking: 0, weight: 300 },
  displaySm: { size: 23, leading: 29, tracking: 0, weight: 300 },
  /**
   * Screen titles only. Caps need generous tracking and tighter leading than
   * mixed case, and they are deliberately NOT used for longer headings: caps
   * everywhere flattens the hierarchy against the eyebrow labels, which are
   * already uppercase.
   */
  displayCaps: { size: 26, leading: 30, tracking: 0.09, weight: 300 },
  /** All-caps section labels. Wide tracking, echoing the site's voice. */
  eyebrow: { size: 12, leading: 16, tracking: 0.18, weight: 600 },
  /**
   * Nav labels. Deliberately NOT the eyebrow style shrunk down: at 9px the
   * eyebrow's 600 weight and 0.18em tracking outweigh the icon sitting above
   * it, and caps that small stop being readable at a glance. This is the one
   * label in the app that is meant to be quieter than what it labels.
   */
  navLabel: { size: 10, leading: 12, tracking: 0.01, weight: 500 },
  bodyLg: { size: 17, leading: 26, tracking: 0, weight: 400 },
  body: { size: 15, leading: 23, tracking: 0, weight: 400 },
  bodySm: { size: 13, leading: 19, tracking: 0, weight: 400 },
  caption: { size: 12, leading: 16, tracking: 0.01, weight: 400 },
  /** Prices. Tabular numerals applied via font-variant-numeric. */
  price: { size: 20, leading: 24, tracking: -0.01, weight: 600 },
  priceLg: { size: 32, leading: 36, tracking: -0.02, weight: 600 },
} as const;

export const motion = {
  /** No bounce on anything financial — see duration/easing pairs below. */
  fast: 200,
  base: 260,
  slow: 320,
  /** Spring-ish, for nav and sheet transitions. */
  spring: 'cubic-bezier(0.32, 0.72, 0, 1)',
  /** Flat ease for money: totals, prices, confirmations. */
  money: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const elevation = {
  card: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)',
  sheet: '0 -4px 24px rgba(0,0,0,0.12)',
  /**
   * Ambient shadow under the floating nav capsule. Kept light on purpose: at
   * a heavier value the capsule stops reading as a pane hovering above the
   * content and starts reading as a sticker pasted onto it. Separation comes
   * from the blur and the lit rim, not from a dark halo.
   */
  nav: '0 10px 30px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)',
} as const;

export const layout = {
  /** Minimum touch target. WCAG 2.5.5 / Apple HIG. */
  tapTarget: 44,
  /** Gap between the nav capsule and the safe-area inset. */
  navFloat: 16,
  navHeight: 62,
  /** Content max width, so the app stays readable on tablets. */
  contentMax: 560,
} as const;

export const blur = {
  /**
   * backdrop-filter on the nav capsule and sheets. The blur carries the
   * separation now that the shadow and rim are light, so it runs deeper than
   * before; the saturation is pulled back because at 180% anything passing
   * under the bar had its colour visibly pushed — navy paint went electric.
   *
   * Depth is also what buys the transparency: at 24px a line of body copy
   * scrolling under the capsule stayed legible and competed with the tab
   * labels, so the fill had to carry the separation. At 36px it diffuses into
   * tone, which is why the fill can sit lower than it used to and the bar
   * still reads glass rather than frost.
   */
  glass: 36,
  glassSaturate: 150,
} as const;
