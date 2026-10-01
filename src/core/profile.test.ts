import { describe, expect, it } from 'vitest';
import {
  firstName,
  looksLikeCode,
  looksLikeEmail,
  normaliseEmail,
  profileFromRow,
  profilePatchToRow,
} from './profile';

const row = {
  id: 'u1',
  role: 'owner',
  email: 'brandon@example.com',
  full_name: 'Brandon Beezy',
  phone: null,
  gallery_consent: false,
};

describe('profileFromRow', () => {
  it('maps columns and blanks nulls', () => {
    expect(profileFromRow(row)).toEqual({
      id: 'u1',
      role: 'owner',
      email: 'brandon@example.com',
      fullName: 'Brandon Beezy',
      phone: '',
      galleryConsent: false,
    });
  });

  it('reads a role it does not know as the least-privileged shell', () => {
    expect(profileFromRow({ ...row, role: 'superuser' }).role).toBe('customer');
  });
});

describe('profilePatchToRow', () => {
  it('sends only the columns the client is granted', () => {
    // Role is not representable in a patch; an injected one must not pass through.
    const patch = { fullName: ' Marcus ', role: 'owner' } as unknown as Parameters<typeof profilePatchToRow>[0];
    expect(profilePatchToRow(patch)).toEqual({ full_name: 'Marcus' });
  });

  it('stores a cleared field as null, not an empty string', () => {
    expect(profilePatchToRow({ phone: '   ' })).toEqual({ phone: null });
  });
});

describe('helpers', () => {
  it('firstName falls back to the email', () => {
    expect(firstName({ fullName: 'Marcus Boudreaux', email: 'm@x.com' })).toBe('Marcus');
    expect(firstName({ fullName: '  ', email: 'marcus@x.com' })).toBe('marcus');
  });

  it('normalises email the way the allowlist compares it', () => {
    expect(normaliseEmail('  Marcus@Example.COM ')).toBe('marcus@example.com');
  });

  it('validates loosely', () => {
    expect(looksLikeEmail('a@b.co')).toBe(true);
    expect(looksLikeEmail('a@b')).toBe(false);
    expect(looksLikeCode('123456')).toBe(true);
    expect(looksLikeCode('12345')).toBe(false);
    expect(looksLikeCode('12345678')).toBe(true);
    expect(looksLikeCode('12a456')).toBe(false);
  });
});
