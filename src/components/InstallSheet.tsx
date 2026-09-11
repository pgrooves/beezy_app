import { useEffect, useState } from 'react';
import { platform } from '../lib/platform';

/**
 * Add-to-Home-Screen instructions.
 *
 * Safari fires no beforeinstallprompt, so on iOS the only install path is the
 * Share sheet and the only thing we can do is show a tester where it is.
 * Hidden once the app is running standalone.
 */
export function InstallSheet() {
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(() => platform.appShell.displayMode() === 'standalone');
  const isIOS = platform.appShell.isIOS();
  const canPrompt = platform.appShell.canPromptInstall();

  useEffect(
    () => platform.appShell.onDisplayModeChange((mode) => setInstalled(mode === 'standalone')),
    [],
  );

  if (installed) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="eyebrow rounded-[var(--radius-full)] border border-[var(--c-hairline)] px-[var(--space-xl)] py-[var(--space-md)] text-[var(--c-ink-muted)]"
      >
        Install this app
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-[var(--c-scrim)]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        className="glass relative w-full max-w-[var(--layout-content-max)] rounded-t-[var(--radius-sheet)] px-[var(--space-gutter)] pt-[var(--space-2xl)]"
        style={{ paddingBottom: 'max(var(--space-2xl), env(safe-area-inset-bottom))' }}
      >
        <h2 id="install-title" className="font-display text-[24px] leading-[30px]">
          Add Beezy to your Home Screen
        </h2>

        {isIOS ? (
          <ol className="mt-[var(--space-xl)] space-y-[var(--space-lg)] text-[15px] leading-[23px]">
            <Step n={1}>
              Tap the <strong>Share</strong> button in Safari&rsquo;s toolbar — the square with an
              arrow pointing up.
            </Step>
            <Step n={2}>
              Scroll down and tap <strong>Add to Home Screen</strong>.
            </Step>
            <Step n={3}>
              Tap <strong>Add</strong>. Beezy opens full screen from your Home Screen, like any
              other app.
            </Step>
          </ol>
        ) : canPrompt ? (
          <div className="mt-[var(--space-xl)]">
            <p className="text-[15px] leading-[23px] text-[var(--c-ink-muted)]">
              Install Beezy for full-screen access and faster launches.
            </p>
            <button
              type="button"
              onClick={() => void platform.appShell.promptInstall().then(() => setOpen(false))}
              className="eyebrow mt-[var(--space-xl)] w-full rounded-[var(--radius-full)] bg-[var(--c-brand)] py-[var(--space-lg)] text-[var(--c-on-brand)]"
            >
              Install
            </button>
          </div>
        ) : (
          <ol className="mt-[var(--space-xl)] space-y-[var(--space-lg)] text-[15px] leading-[23px]">
            <Step n={1}>Open your browser&rsquo;s menu.</Step>
            <Step n={2}>
              Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
            </Step>
          </ol>
        )}

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="eyebrow mt-[var(--space-2xl)] w-full py-[var(--space-lg)] text-[var(--c-ink-muted)]"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-[var(--space-lg)]">
      <span
        aria-hidden
        className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-full)] border border-[var(--c-hairline)] text-[13px] text-[var(--c-ink-muted)]"
      >
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
