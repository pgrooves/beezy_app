import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * "Update available — tap to reload."
 *
 * Silent stale caching is the fastest way to waste a tester's time debugging a
 * bug that is already fixed, so the service worker registers in 'prompt' mode
 * and this is the affordance.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 z-50 flex justify-center px-[var(--space-gutter)]"
      style={{ bottom: 'max(var(--space-lg), env(safe-area-inset-bottom))' }}
    >
      <div className="glass relative flex w-full max-w-[var(--layout-content-max)] items-center gap-[var(--space-md)] rounded-[var(--radius-full)] py-[var(--space-md)] pl-[var(--space-xl)] pr-[var(--space-sm)]">
        <span className="flex-1 text-[13px] leading-[18px]">A new version is ready.</span>
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="eyebrow rounded-[var(--radius-full)] bg-[var(--c-accent)] px-[var(--space-lg)] text-[var(--c-on-accent)]"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          aria-label="Dismiss update notice"
          className="px-[var(--space-sm)] text-[var(--c-ink-muted)]"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
