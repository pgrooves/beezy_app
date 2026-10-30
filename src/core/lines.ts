/**
 * Beezy's two lines of business, and which one a screen belongs to.
 *
 * The app opens on a choice between them (DECISIONS.md#0024). Detailing is the
 * app as it was built; Chauffeur is being scoped and has no screens of its own
 * yet beyond a placeholder, which `live` keeps honest.
 */

export type BusinessLine = 'detailing' | 'chauffeur';

export interface LineDef {
  id: BusinessLine;
  label: string;
  /** One line under the label on the front door. */
  tagline: string;
  /** Where choosing the line takes you. */
  home: string;
  /** Portable asset path, resolved by lib/assets. */
  photo: string;
  photoAlt: string;
  /**
   * False while the line is a placeholder. A placeholder is never remembered
   * as the customer's choice, so nobody is dropped onto it at every launch.
   */
  live: boolean;
}

export const LINES: Record<BusinessLine, LineDef> = {
  detailing: {
    id: 'detailing',
    label: 'Detailing',
    tagline: 'Mobile luxury detailing, at your door',
    home: '/detailing',
    photo: 'brand/photos/foam-windshield.webp',
    photoAlt: 'Foam across a windshield mid-detail',
    live: true,
  },
  chauffeur: {
    id: 'chauffeur',
    label: 'Chauffeur',
    tagline: 'Private car and driver, by the trip or the hour',
    home: '/chauffeur',
    photo: 'brand/photos/work-escalade.webp',
    photoAlt: 'A black Cadillac Escalade',
    live: false,
  },
};

/** Front-door order. */
export const LINE_ORDER: BusinessLine[] = ['detailing', 'chauffeur'];

export function isLine(value: string | null | undefined): value is BusinessLine {
  return value === 'detailing' || value === 'chauffeur';
}

/** The line a stored choice should reopen, or null to show the front door. */
export function rememberedLine(stored: string | null): BusinessLine | null {
  return isLine(stored) && LINES[stored].live ? stored : null;
}

/**
 * Which line a path belongs to, or null for the front door and shared screens.
 *
 * Detailing kept its original paths when the door went in (only its home
 * moved, to /detailing), so anything not under /chauffeur that a customer
 * reaches is detailing. Staff, auth and account screens belong to neither.
 */
export function lineForPath(pathname: string): BusinessLine | null {
  if (pathname === '/chauffeur' || pathname.startsWith('/chauffeur/')) return 'chauffeur';
  if (pathname === '/' || pathname === '/choose') return null;
  if (pathname.startsWith('/admin') || pathname.startsWith('/sign-in') || pathname.startsWith('/settings')) {
    return null;
  }
  return 'detailing';
}
