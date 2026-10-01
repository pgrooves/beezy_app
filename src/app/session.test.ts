import { describe, expect, it } from 'vitest';
import { describeSendError, describeVerifyError } from './session';

describe('sign-in error copy', () => {
  it('reads the allowlist abort as invite-only', () => {
    // What GoTrue returns when the 0004 trigger refuses an address.
    const error = { message: 'Database error saving new user', status: 500, code: 'unexpected_failure' };
    expect(describeSendError(error)).toMatch(/invite-only/);
  });

  it('does not blame the tester when the built-in mailer refuses their address', () => {
    const error = { message: 'Email address not authorized', status: 400, code: 'email_address_not_authorized' };
    expect(describeSendError(error)).toMatch(/can’t send sign-in emails/);
  });

  it('distinguishes rate limiting from failure', () => {
    expect(describeSendError({ message: 'x', status: 429, code: 'over_email_send_rate_limit' })).toMatch(
      /Too many/,
    );
    expect(describeSendError({ message: 'fetch failed', status: 0, code: undefined })).toMatch(
      /connection/,
    );
  });

  it('explains a wrong or expired code', () => {
    expect(
      describeVerifyError({ message: 'Token has expired or is invalid', status: 403, code: 'otp_expired' }),
    ).toMatch(/didn’t match/);
    expect(describeVerifyError(null)).toMatch(/connection/);
  });
});
