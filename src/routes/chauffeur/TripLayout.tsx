import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TRIP_STEPS, useTrip, type TripStepPath } from '../../app/trip';
import { formatMoney } from '../../core/pricing';
import { cx } from '../../components/ui/cx';
import { platform } from '../../lib/platform';

/**
 * Frame for building a chauffeur trip. Same furniture as the detailing
 * booking flow: progress at the top, the running estimate in a glass footer,
 * so the price is never a reveal.
 *
 * Review is the end of the line until step C3: the request button says
 * requests open soon rather than pretending to send (DECISIONS.md#0025).
 */
export function TripLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  // Whole-store subscription: `quote` and `problem` are stable references,
  // so selecting them alone would never re-render.
  const trip = useTrip();
  const quote = trip.quote();
  const problem = trip.problem();

  const current = location.pathname.split('/').pop() as TripStepPath;
  const index = TRIP_STEPS.findIndex((s) => s.path === current);
  const step = TRIP_STEPS[index];
  const isReview = current === 'review';

  // Nothing to review until the trip is complete.
  if (isReview && problem) return <Navigate to="/chauffeur/book/build" replace />;

  const goBack = () => navigate(isReview ? '/chauffeur/book/build' : '/chauffeur');
  const goNext = () => {
    if (problem || isReview) return;
    platform.haptics.selection();
    navigate('/chauffeur/book/review');
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className="mx-auto w-full max-w-[var(--layout-content-max)] px-[var(--space-gutter)]"
        style={{ paddingTop: 'max(var(--space-lg), calc(env(safe-area-inset-top) + var(--space-sm)))' }}
      >
        <div className="flex items-center gap-[var(--space-lg)] py-[var(--space-md)]">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back"
            className="-ml-[var(--space-sm)] flex h-11 w-11 items-center justify-center text-[var(--c-ink)]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="m14.5 5-7 7 7 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className="eyebrow flex-1 text-[var(--c-ink-subtle)]">
            Step {index + 1} of {TRIP_STEPS.length} · {step?.label}
          </p>
        </div>
        <div className="flex gap-[3px]" aria-hidden>
          {TRIP_STEPS.map((s, i) => (
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
        style={{ paddingBottom: 'calc(160px + env(safe-area-inset-bottom))' }}
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
              <p className="eyebrow text-[var(--c-ink-subtle)]">Estimate</p>
              <p className="money text-[28px] leading-[32px]" style={{ transition: 'opacity var(--motion-fast) var(--motion-money)' }}>
                {formatMoney(quote.totalCents)}
              </p>
            </div>
            <button
              type="button"
              onClick={goNext}
              disabled={!!problem || isReview}
              className={cx(
                'eyebrow rounded-[var(--radius-full)] bg-[var(--c-brand)] px-[var(--space-2xl)] py-[var(--space-lg)] text-[var(--c-on-brand)] transition-[opacity,transform]',
                problem || isReview ? 'pointer-events-none opacity-30' : 'active:scale-[0.98]',
              )}
            >
              {isReview ? 'Requests open soon' : 'Review'}
            </button>
          </div>
          {problem && !isReview && (
            <p role="status" className="mt-[var(--space-md)] text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
              {problem}
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
