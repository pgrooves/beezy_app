import { Link } from 'react-router-dom';
import { cx } from '../ui/cx';
import { useDismiss, useScrollLock } from '../../lib/platform/hooks';
import type { MoreLink } from '../../app/routes';

/**
 * The trailing ••• opens this, not a new page — the brief is explicit, and it
 * matters: More is a drawer of secondary destinations, and pushing a route for
 * it would put a back button in front of every one of them.
 */
export function MoreSheet({
  open,
  onClose,
  groups,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  groups: { title?: string; links: MoreLink[] }[];
  footer?: React.ReactNode;
}) {
  // Escape closes it, and the page behind must not scroll while it is up.
  useDismiss(open, onClose);
  useScrollLock(open);

  return (
    <div
      className={cx(
        'fixed inset-0 z-50 flex items-end justify-center',
        !open && 'pointer-events-none',
      )}
      aria-hidden={!open}
      // `inert` is what makes aria-hidden honest. Marking the subtree hidden
      // while it still holds reachable controls is an axe failure in its own
      // right (`aria-hidden-focus`), and it is a real one: the closed sheet sat
      // in the tab order, so a keyboard user tabbed into a drawer they could
      // not see. Per-element tabIndex did not cover it — anything passed in as
      // `footer` brought its own focusable controls. inert covers the subtree.
      //
      // Spread as a string rather than a boolean prop: React 18 does not know
      // `inert` and warns on `inert={true}`, but renders an unknown attribute
      // with a string value verbatim, and the attribute's presence is what the
      // browser acts on.
      {...(open ? {} : { inert: '' })}
    >
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-[var(--c-scrim)] transition-opacity"
        style={{
          opacity: open ? 1 : 0,
          transitionDuration: 'var(--motion-base)',
        }}
      />
      <div
        role="dialog"
        aria-modal={open}
        aria-label="More"
        className="glass-sheet relative w-full max-w-[var(--layout-content-max)] rounded-t-[var(--radius-sheet)] px-[var(--space-gutter)] pt-[var(--space-lg)]"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom) + var(--space-2xl))',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform var(--motion-base) var(--motion-spring)',
          maxHeight: '82vh',
          overflowY: 'auto',
        }}
      >
        <div
          aria-hidden
          className="mx-auto mb-[var(--space-lg)] h-1 w-9 rounded-full bg-[var(--c-ink-subtle)]"
          style={{ opacity: 0.35 }}
        />
        {groups.map((group, i) => (
          <section key={group.title ?? i} className="mb-[var(--space-lg)]">
            {group.title && (
              <h3 className="eyebrow mb-[var(--space-sm)] text-[var(--c-ink-subtle)]">
                {group.title}
              </h3>
            )}
            <div className="rounded-[var(--radius-card)] border border-[var(--c-hairline)] bg-[var(--c-surface)] px-[var(--space-lg)]">
              {group.links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  className="flex items-center gap-[var(--space-lg)] border-b border-[var(--c-hairline)] py-[var(--space-lg)] last:border-b-0"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] leading-[23px]">{link.label}</span>
                    {link.detail && (
                      <span className="block text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">
                        {link.detail}
                      </span>
                    )}
                  </span>
                  <span aria-hidden className="text-[var(--c-ink-subtle)]">
                    ›
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
        {footer}
      </div>
    </div>
  );
}
