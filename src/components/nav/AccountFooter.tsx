import { useSession } from '../../app/session';
import { Button } from '../ui';

/**
 * Foot of the More sheet: who you are, or the way in.
 *
 * Replaces the preview role switcher (DECISIONS.md#0012). Role now comes from
 * the profile, so there is nothing here to switch.
 */
export function AccountFooter({ onNavigate }: { onNavigate?: () => void }) {
  const status = useSession((s) => s.status);
  const profile = useSession((s) => s.profile);

  if (status === 'loading' || status === 'unavailable') return null;

  if (status === 'signedOut') {
    return (
      <section className="mt-[var(--space-lg)]">
        <p className="mb-[var(--space-md)] text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">
          Sign in to book, and to see your garage and receipts.
        </p>
        <span onClickCapture={onNavigate} className="block">
          <Button to="/sign-in" full>
            Sign in
          </Button>
        </span>
      </section>
    );
  }

  return (
    <p className="mt-[var(--space-lg)] text-center text-[12px] leading-[17px] text-[var(--c-ink-subtle)]">
      Signed in as {profile?.email || 'you'}
    </p>
  );
}
