/**
 * Mapping between `public.profiles` rows and the domain `Profile`.
 *
 * Pure, so the native app reads the same rows the same way.
 */
import type { Profile, ProfilePatch, Role } from './types';

export interface ProfileRow {
  id: string;
  role: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  gallery_consent: boolean;
}

/** The columns the app selects. Kept beside the row type so they cannot drift. */
export const PROFILE_COLUMNS = 'id, role, email, full_name, phone, gallery_consent';

const ROLES: readonly Role[] = ['customer', 'tech', 'admin', 'owner'];

/**
 * An unknown role reads as `customer`, the least-privileged shell. The
 * database enum makes that unreachable today; if a role is ever added there
 * before the app learns it, the safe failure is the narrower UI.
 */
export function profileFromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    role: (ROLES as readonly string[]).includes(row.role) ? (row.role as Role) : 'customer',
    email: row.email ?? '',
    fullName: row.full_name ?? '',
    phone: row.phone ?? '',
    galleryConsent: row.gallery_consent,
  };
}

/**
 * Only the columns 0004 grants the client. Sending `role` here would be
 * refused by the database anyway; leaving it unrepresentable keeps the
 * refusal from ever being the first line of defence.
 */
export function profilePatchToRow(patch: ProfilePatch) {
  const row: Partial<Pick<ProfileRow, 'full_name' | 'phone' | 'gallery_consent'>> = {};
  if (patch.fullName !== undefined) row.full_name = patch.fullName.trim() || null;
  if (patch.phone !== undefined) row.phone = patch.phone.trim() || null;
  if (patch.galleryConsent !== undefined) row.gallery_consent = patch.galleryConsent;
  return row;
}

/** "Marcus Boudreaux" → "Marcus". Falls back to the email's local part. */
export function firstName(profile: Pick<Profile, 'fullName' | 'email'>): string {
  const first = profile.fullName.trim().split(/\s+/)[0];
  if (first) return first;
  return profile.email.split('@')[0] ?? '';
}

/** Lower-cased and trimmed: how the allowlist and Supabase Auth compare it. */
export function normaliseEmail(input: string): string {
  return input.trim().toLowerCase();
}

/** Deliberately loose. The server is the real check; this catches typos. */
export function looksLikeEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}

/**
 * Supabase email OTPs are six digits by default, and the length is a
 * dashboard setting (6–10), so accept the whole range rather than pin a value
 * that lives outside the repo.
 */
export function looksLikeCode(input: string): boolean {
  return /^\d{6,10}$/.test(input.trim());
}
