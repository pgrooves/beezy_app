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
    /** Tertiary copy: placeholders, disabled. AA against bg at 14px+. */
    inkSubtle: '#8E8E8E',
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
     * The same gold, darkened until it passes AA as text: 4.67:1 on `bg`,
     * 4.87:1 on `surface`. Use this for any gold *lettering*.
     */
    accentText: '#8A6D2F',
    success: '#34C759',
    warning: '#FF9F0A',
    danger: '#FF453A',
    /** Liquid Glass: translucent fill behind backdrop-filter. */
    glass: 'rgba(255, 255, 255, 0.68)',
    /** Opaque fallback when the OS asks to reduce transparency. */
    glassSolid: '#FFFFFF',
    /** Inner hairline stroke on the glass capsule. */
    glassStroke: 'rgba(255, 255, 255, 0.85)',
    /** Specular highlight along the capsule's top rim. */
    glassSpecular: 'rgba(255, 255, 255, 0.95)',
    scrim: 'rgba(17, 17, 17, 0.42)',
  },
  dark: {
    bg: '#0A0A0A',
    surface: '#151515',
    surfaceAlt: '#1E1E1E',
    ink: '#F5F5F5',
    inkMuted: '#A1A1A1',
    inkSubtle: '#7A7A7A',
    hairline: '#262626',
    brand: '#F5F5F5',
    onBrand: '#111111',
    accent: '#C9A961',
    onAccent: '#111111',
    // On near-black the bright champagne already reaches 8.8:1, so text and
    // fill share one value here.
    accentText: '#C9A961',
    success: '#34C759',
    warning: '#FF9F0A',
    danger: '#FF453A',
    glass: 'rgba(21, 21, 21, 0.62)',
    glassSolid: '#151515',
    glassStroke: 'rgba(255, 255, 255, 0.08)',
    glassSpecular: 'rgba(255, 255, 255, 0.22)',
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
   * Display face. The wordmark is a high-contrast Didone, so headings use a
   * serif to match it rather than the grotesque the brief first assumed.
   * See docs/DECISIONS.md#0004.
   */
  display: "'Playfair Display', 'Didot', 'Bodoni MT', Georgia, serif",
  /** UI and body. */
  body: "'Inter Tight', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  /** Prices, invoices, reporting. Tabular figures, always. */
  numeric: "'Inter Tight', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
} as const;

/** size / lineHeight / letterSpacing / weight, in px except tracking (em). */
export const textStyle = {
  displayLg: { size: 40, leading: 44, tracking: 0.01, weight: 500 },
  displayMd: { size: 32, leading: 38, tracking: 0.01, weight: 500 },
  displaySm: { size: 24, leading: 30, tracking: 0.01, weight: 500 },
  /** All-caps section labels. Wide tracking, echoing the site's voice. */
  eyebrow: { size: 12, leading: 16, tracking: 0.18, weight: 600 },
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
  /** Ambient shadow under the floating nav capsule. */
  nav: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)',
} as const;

export const layout = {
  /** Minimum touch target. WCAG 2.5.5 / Apple HIG. */
  tapTarget: 44,
  /** Gap between the nav capsule and the safe-area inset. */
  navFloat: 16,
  navHeight: 64,
  /** Content max width, so the app stays readable on tablets. */
  contentMax: 560,
} as const;

export const blur = {
  /** backdrop-filter on the nav capsule and sheets. */
  glass: 24,
  glassSaturate: 180,
} as const;
