import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Field, FormMessage, Screen, ScreenHeader, inputClass } from '../../components/ui';
import { cx } from '../../components/ui/cx';
import { useSession } from '../../app/session';
import { homeForRole } from '../../app/routes';
import { looksLikeCode, looksLikeEmail, normaliseEmail } from '../../core/profile';
import { platform } from '../../lib/platform';

/**
 * Sign in with a code sent by email.
 *
 * A code rather than a magic link, because a link opens in Safari — and an
 * app installed to the Home Screen keeps its own storage, so the session
 * would land in the browser while the installed app stayed signed out. A code
 * is typed into the app that asked for it. See DECISIONS.md#0021.
 *
 * There is no separate sign-up: an invited address that has never signed in
 * gets its account on first code.
 */
export default function SignIn() {
  const status = useSession((s) => s.status);
  const role = useSession((s) => s.role);
  const sendCode = useSession((s) => s.sendCode);
  const verifyCode = useSession((s) => s.verifyCode);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  // Already signed in (a reload, or the back button): nothing to do here.
  if (status === 'signedIn' && !busy) {
    return <Navigate to={next ?? homeForRole(role)} replace />;
  }

  const send = async (address: string) => {
    setBusy(true);
    setError(null);
    const result = await sendCode(address);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      platform.haptics.error();
      return false;
    }
    setSentTo(normaliseEmail(address));
    return true;
  };

  const onEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!looksLikeEmail(email)) {
      setError('That email address doesn’t look right.');
      return;
    }
    await send(email);
  };

  const onCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!sentTo) return;
    if (!looksLikeCode(code)) {
      setError('Enter the code from the email — numbers only.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await verifyCode(sentTo, code);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      platform.haptics.error();
      return;
    }
    platform.haptics.success();
    // verifyCode resolves the profile first, so this is already the real role.
    navigate(next ?? homeForRole(useSession.getState().role), { replace: true });
  };

  return (
    <Screen>
      <ScreenHeader eyebrow="Welcome" title="Sign in" />

      {status === 'unavailable' ? (
        <p className="mt-[var(--space-xl)] text-[15px] leading-[23px] text-[var(--c-ink-muted)]">
          Sign-in isn&rsquo;t available on this build. The gallery, services and About are all
          still open.
        </p>
      ) : !sentTo ? (
        <form onSubmit={onEmail} noValidate className="mt-[var(--space-xl)]">
          <p className="mb-[var(--space-xl)] text-[15px] leading-[23px] text-[var(--c-ink-muted)]">
            Enter your email and we&rsquo;ll send you a code. No password to remember.
          </p>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="email"
              placeholder="you@example.com"
              className={inputClass}
              aria-invalid={error ? true : undefined}
            />
          </Field>
          {error && <FormMessage>{error}</FormMessage>}
          <div className="mt-[var(--space-xl)]">
            <Button type="submit" full disabled={busy || !email.trim()}>
              {busy ? 'Sending…' : 'Send code'}
            </Button>
          </div>
          <p className="mt-[var(--space-lg)] text-[12px] leading-[17px] text-[var(--c-ink-subtle)]">
            The app is invite-only during the beta.
          </p>
        </form>
      ) : (
        <form onSubmit={onCode} noValidate className="mt-[var(--space-xl)]">
          <p className="mb-[var(--space-xl)] text-[15px] leading-[23px] text-[var(--c-ink-muted)]">
            We sent a code to <span className="text-[var(--c-ink)]">{sentTo}</span>. It can take
            a minute, and it may land in spam.
          </p>
          <Field label="Code">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              // `one-time-code` lets iOS offer the code from Mail above the
              // keyboard, so most people never switch apps.
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={10}
              placeholder="123456"
              className={cx(inputClass, 'tabular tracking-[0.3em]')}
              aria-invalid={error ? true : undefined}
            />
          </Field>
          {error && <FormMessage>{error}</FormMessage>}
          {resent && !error && <FormMessage tone="success">A new code is on its way.</FormMessage>}
          <div className="mt-[var(--space-xl)]">
            <Button type="submit" full disabled={busy || !code}>
              {busy ? 'Checking…' : 'Sign in'}
            </Button>
          </div>
          <div className="mt-[var(--space-lg)] flex justify-between gap-[var(--space-lg)]">
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setSentTo(null);
                setCode('');
                setError(null);
                setResent(false);
              }}
            >
              Different email
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                setResent(false);
                setCode('');
                setResent(await send(sentTo));
              }}
            >
              Send again
            </Button>
          </div>
        </form>
      )}
    </Screen>
  );
}

/**
 * Only same-app paths. `next` arrives in the URL, so without this a link to
 * /sign-in?next=//evil.example would bounce a fresh session off-site.
 */
function safeNext(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return null;
  }
  return value;
}
