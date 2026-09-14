import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BOOKING_STEPS, useBooking, type StepPath } from '../../../app/booking';
import { formatMoney } from '../../../core/pricing';
import { cx } from '../../../components/ui/cx';
import { platform } from '../../../lib/platform';

/**
 * Frame for the booking flow: progress at the top, the running total pinned in
 * a glass footer at the bottom.
 *
 * The total is visible from step one and animates on change, so the price is
 * never a reveal. That single decision is what stops the flow feeling like an
 * interrogation — the customer can see what each answer costs as they give it.
 */
export function BookLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  // Subscribe to the whole draft, not to `quote`/`canAdvance` individually:
  // those are stable function references, so selecting them would never
  // re-render and the running total and Continue button would sit frozen
  // while the customer filled the flow in.
  const booking = useBooking();
  const quote = booking.quote();
  const canAdvance = booking.canAdvance;

  const current = location.pathname.split('/').pop() as StepPath;
  const index = BOOKING_STEPS.findIndex((s) => s.path === current);
  const step = BOOKING_STEPS[index];
  const isLast = index === BOOKING_STEPS.length - 1;
  const ready = step ? canAdvance(step.path) : false;

  // Deep-linking or reloading into a later step would show a screen with
  // nothing behind it — an empty total on Deposit, a summary with no service
  // on Confirm. Send the customer to the first step they have not finished.
  const firstUnfinished = BOOKING_STEPS.findIndex((s) => !canAdvance(s.path));
  if (index > 0 && firstUnfinished !== -1 && firstUnfinished < index) {
    return <Navigate to={`/book/${BOOKING_STEPS[firstUnfinished]!.path}`} replace />;
  }

  const goBack = () => {
    if (index <= 0) navigate('/');
    else navigate(`/book/${BOOKING_STEPS[index - 1]!.path}`);
  };

  const goNext = () => {
    if (!ready) return;
    platform.haptics.selection();
    if (isLast) navigate('/');
    else navigate(`/book/${BOOKING_STEPS[index + 1]!.path}`);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className="mx-auto w-full max-w-[var(--layout-content-max)] px-[var(--space-gutter)]"
        style={{
          paddingTop: 'max(var(--space-lg), calc(env(safe-area-inset-top) + var(--space-sm)))',
        }}
      >
        <div className="flex items-center gap-[var(--space-lg)] py-[var(--space-md)]">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="-ml-[var(--space-sm)] flex h-11 w-11 items-center justify-center text-[var(--c-ink)]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="m14.5 5-7 7 7 7"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <p className="eyebrow flex-1 text-[var(--c-ink-subtle)]">
            Step {index + 1} of {BOOKING_STEPS.length} · {step?.label}
          </p>
        </div>

        {/* Segment per step rather than a single bar: it shows how much is
            left, which a percentage does not. */}
        <div className="flex gap-[3px]" aria-hidden>
          {BOOKING_STEPS.map((s, i) => (
            <span
              key={s.path}
              className={cx(
                'h-[3px] flex-1 rounded-full transition-colors',
                i <= index ? 'bg-[var(--c-accent)]' : 'bg-[var(--c-hairline)]',
              )}
              style={{ transitionDuration: 'var(--motion-base)' }}
            />
          ))}
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-[var(--layout-content-max)] flex-1 px-[var(--space-gutter)] pt-[var(--space-xl)]"
        style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom))' }}
      >
        <Outlet />
      </main>

      <footer
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-[var(--space-lg)]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + var(--space-lg))' }}
      >
        <div className="glass pointer-events-auto relative w-full max-w-[var(--layout-content-max)] rounded-[var(--radius-sheet)] p-[var(--space-lg)]">
          <div className="flex items-end justify-between gap-[var(--space-lg)]">
            <div className="min-w-0">
              <p className="eyebrow text-[var(--c-ink-subtle)]">
                {quote?.needsReview ? 'Estimate' : 'Running total'}
              </p>
              <p
                className="money text-[28px] leading-[32px]"
                style={{ transition: 'opacity var(--motion-fast) var(--motion-money)' }}
              >
                {quote ? formatMoney(quote.subtotalCents) : '—'}
              </p>
            </div>
            <button
              type="button"
              onClick={goNext}
              disabled={!ready}
              className={cx(
                'eyebrow rounded-[var(--radius-full)] px-[var(--space-2xl)] py-[var(--space-lg)] transition-[opacity,transform]',
                ready
                  ? 'bg-[var(--c-brand)] text-[var(--c-on-brand)] active:scale-[0.98]'
                  : 'pointer-events-none bg-[var(--c-brand)] text-[var(--c-on-brand)] opacity-30',
              )}
            >
              {isLast ? 'Done' : 'Continue'}
            </button>
          </div>
          {quote?.needsReview && (
            <p className="mt-[var(--space-md)] text-[12px] leading-[17px] text-[var(--c-ink-subtle)]">
              Beezy confirms the final price from your photos before he starts. You approve it in
              the app.
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
