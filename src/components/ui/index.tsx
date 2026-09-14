import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from './cx';

/**
 * Shared primitives. Everything reads from the theme tokens — no hex literal
 * appears below, so a change in src/theme/tokens.ts moves the whole app.
 */


// ---------------------------------------------------------------------------
// Screen scaffolding
// ---------------------------------------------------------------------------

/**
 * Page wrapper. Owns the screen gutter and the bottom padding that keeps
 * content clear of the floating nav capsule, so no screen has to remember it.
 */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx('mx-auto w-full max-w-[var(--layout-content-max)]', className)}
      style={{
        paddingLeft: 'var(--space-gutter)',
        paddingRight: 'var(--space-gutter)',
        // Nav height + float + safe area + breathing room.
        paddingBottom: 'calc(var(--layout-nav-height) + var(--layout-nav-float) + env(safe-area-inset-bottom) + var(--space-2xl))',
      }}
    >
      {children}
    </div>
  );
}

/** Large screen title, with an optional eyebrow above it. */
export function ScreenHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header
      className="flex items-end justify-between gap-[var(--space-lg)]"
      style={{
        paddingTop: 'max(var(--space-2xl), calc(env(safe-area-inset-top) + var(--space-lg)))',
        paddingBottom: 'var(--space-xl)',
      }}
    >
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow text-[var(--c-ink-subtle)]">{eyebrow}</p>}
        <h1 className="font-display mt-[var(--space-xs)] text-[32px] leading-[38px]">{title}</h1>
      </div>
      {action}
    </header>
  );
}

/** Section label + optional trailing link. */
export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; to: string };
}) {
  return (
    <div className="mb-[var(--space-lg)] mt-[var(--space-2xl)] flex items-baseline justify-between">
      <h2 className="eyebrow text-[var(--c-ink-subtle)]">{title}</h2>
      {action && (
        <Link
          to={action.to}
          className="text-[13px] leading-[19px] text-[var(--c-ink-muted)] underline underline-offset-4"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Card({
  children,
  className,
  to,
  onClick,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  to?: string;
  onClick?: () => void;
  padded?: boolean;
}) {
  const classes = cx(
    'block w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--c-hairline)] bg-[var(--c-surface)] text-left',
    padded && 'p-[var(--space-xl)]',
    (to || onClick) && 'transition-transform active:scale-[0.99]',
    className,
  );
  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {children}
      </button>
    );
  }
  return <div className={classes}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--c-brand)] text-[var(--c-on-brand)]',
  secondary: 'border border-[var(--c-hairline)] bg-[var(--c-surface)] text-[var(--c-ink)]',
  ghost: 'text-[var(--c-ink-muted)]',
  danger: 'bg-[var(--c-danger)] text-white',
};

export function Button({
  children,
  onClick,
  to,
  variant = 'primary',
  full,
  disabled,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  to?: string;
  variant?: ButtonVariant;
  full?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const classes = cx(
    'eyebrow inline-flex items-center justify-center rounded-[var(--radius-full)] px-[var(--space-2xl)] py-[var(--space-lg)] transition-[transform,opacity]',
    BUTTON_STYLES[variant],
    full && 'w-full',
    disabled ? 'pointer-events-none opacity-40' : 'active:scale-[0.98]',
  );
  if (to && !disabled) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}

/** Small status/category pill. */
export function Chip({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}) {
  const tones = {
    neutral: 'border-[var(--c-hairline)] text-[var(--c-ink-muted)]',
    accent: 'border-[var(--c-accent)] text-[var(--c-accent-text)]',
    success: 'border-[var(--c-success)] text-[var(--c-success)]',
    warning: 'border-[var(--c-warning)] text-[var(--c-warning)]',
    danger: 'border-[var(--c-danger)] text-[var(--c-danger)]',
  };
  return (
    <span
      className={cx(
        'eyebrow inline-flex items-center rounded-[var(--radius-full)] border px-[var(--space-md)] py-[2px] text-[10px]',
        tones[tone],
      )}
      style={{ minHeight: 0 }}
    >
      {children}
    </span>
  );
}

/** A row in a settings-style list. */
export function ListRow({
  label,
  detail,
  to,
  onClick,
  trailing,
  danger,
}: {
  label: string;
  detail?: string;
  to?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  danger?: boolean;
}) {
  const inner = (
    <>
      <span className="min-w-0 flex-1">
        <span
          className={cx(
            'block text-[15px] leading-[23px]',
            danger ? 'text-[var(--c-danger)]' : 'text-[var(--c-ink)]',
          )}
        >
          {label}
        </span>
        {detail && (
          <span className="block text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">
            {detail}
          </span>
        )}
      </span>
      {trailing ?? (
        (to || onClick) && (
          <span aria-hidden className="text-[var(--c-ink-subtle)]">
            ›
          </span>
        )
      )}
    </>
  );
  const classes =
    'flex w-full items-center gap-[var(--space-lg)] border-b border-[var(--c-hairline)] py-[var(--space-lg)] text-left last:border-b-0';
  if (to) {
    return (
      <Link to={to} className={classes}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {inner}
      </button>
    );
  }
  return <div className={classes}>{inner}</div>;
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--c-hairline)] px-[var(--space-xl)] py-[var(--space-3xl)] text-center">
      <p className="font-display text-[20px] leading-[26px]">{title}</p>
      <p className="mx-auto mt-[var(--space-md)] max-w-[32ch] text-[14px] leading-[21px] text-[var(--c-ink-muted)]">
        {body}
      </p>
      {action && <div className="mt-[var(--space-xl)]">{action}</div>}
    </div>
  );
}

/**
 * Marks a surface that renders demo data rather than anything live. Honest
 * about what is and is not wired up, so nobody mistakes the shell for a
 * working integration.
 */
export function DemoNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-[var(--space-lg)] rounded-[var(--radius-md)] border border-dashed border-[var(--c-hairline)] px-[var(--space-lg)] py-[var(--space-md)] text-[12px] leading-[17px] text-[var(--c-ink-subtle)]">
      {children}
    </p>
  );
}

/** Value + label, for dashboards. */
export function Stat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: 'accent';
}) {
  return (
    <div>
      <p
        className={cx(
          'money text-[28px] leading-[32px]',
          tone === 'accent' && 'text-[var(--c-accent-text)]',
        )}
      >
        {value}
      </p>
      <p className="eyebrow mt-[var(--space-xs)] text-[var(--c-ink-subtle)]">{label}</p>
    </div>
  );
}
