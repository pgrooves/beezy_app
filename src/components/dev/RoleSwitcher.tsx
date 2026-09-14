import { useNavigate } from 'react-router-dom';
import { useSession } from '../../app/session';
import { homeForRole } from '../../app/routes';
import { cx } from '../ui/cx';
import type { Role } from '../../core/types';

/**
 * Preview control. Auth is not wired up yet, so this is how you get from the
 * customer app into the admin portal to look around.
 *
 * It disappears the moment real sign-in lands: role will come from the
 * Supabase profile, and `devMode` goes false. Until then it is honest about
 * being a preview affordance rather than pretending to be account switching.
 */
const ROLES: { role: Role; label: string; detail: string }[] = [
  { role: 'customer', label: 'Customer', detail: 'Home, Book, Garage, Gallery' },
  { role: 'owner', label: 'Owner', detail: 'Today, Schedule, Jobs, Clients' },
  { role: 'tech', label: 'Tech', detail: 'Assigned jobs only' },
];

export function RoleSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const role = useSession((s) => s.role);
  const setRole = useSession((s) => s.setRole);
  const navigate = useNavigate();

  return (
    <section className="mt-[var(--space-lg)] rounded-[var(--radius-card)] border border-dashed border-[var(--c-hairline)] p-[var(--space-lg)]">
      <h3 className="eyebrow text-[var(--c-ink-subtle)]">Preview as</h3>
      <p className="mt-[var(--space-xs)] text-[12px] leading-[17px] text-[var(--c-ink-subtle)]">
        Sign-in isn&rsquo;t wired up yet. Switch roles to look around the other side of the app.
      </p>
      <div className="mt-[var(--space-lg)] flex gap-[var(--space-xs)] rounded-[var(--radius-full)] border border-[var(--c-hairline)] p-[var(--space-xs)]">
        {ROLES.map((option) => (
          <button
            key={option.role}
            type="button"
            aria-pressed={role === option.role}
            onClick={() => {
              setRole(option.role);
              navigate(homeForRole(option.role));
              onNavigate?.();
            }}
            className={cx(
              'eyebrow flex-1 rounded-[var(--radius-full)] px-[var(--space-md)] transition-colors',
              role === option.role
                ? 'bg-[var(--c-brand)] text-[var(--c-on-brand)]'
                : 'text-[var(--c-ink-muted)]',
            )}
            style={{ transitionDuration: 'var(--motion-fast)' }}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="mt-[var(--space-md)] text-[12px] leading-[17px] text-[var(--c-ink-subtle)]">
        {ROLES.find((r) => r.role === role)?.detail}
      </p>
    </section>
  );
}
