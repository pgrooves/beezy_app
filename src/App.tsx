import { InstallSheet } from './components/InstallSheet';
import { UpdatePrompt } from './components/UpdatePrompt';
import { useAppearance, type ThemePreference } from './theme/useAppearance';
import { platform } from './lib/platform';

const BASE = import.meta.env.BASE_URL;

/**
 * Phase 1 shell.
 *
 * Deliberately not the app: this screen exists to prove the pipeline end to
 * end — install, standalone display, theming, safe areas, and the service
 * worker update path. The nav, auth, and booking flow land in Phase 2 and 3.
 */
export default function App() {
  const { preference, setPreference, resolved } = useAppearance();
  const standalone = platform.appShell.displayMode() === 'standalone';

  return (
    <main
      className="mx-auto flex min-h-dvh max-w-[var(--layout-content-max)] flex-col items-center px-[var(--space-gutter)]"
      style={{
        paddingTop: 'max(var(--space-4xl), calc(env(safe-area-inset-top) + var(--space-2xl)))',
        paddingBottom: 'max(var(--space-2xl), env(safe-area-inset-bottom))',
      }}
    >
      <img
        src={`${BASE}brand/logo-stacked-${resolved === 'dark' ? 'white' : 'ink'}.png`}
        alt="Beezy Luxury Detailing"
        width={933}
        height={804}
        className="w-[min(62%,240px)]"
      />

      <p className="eyebrow mt-[var(--space-3xl)] text-center text-[var(--c-accent-text)]">
        Make life easy, call Beezy
      </p>

      <p className="mt-[var(--space-lg)] max-w-[34ch] text-center text-[15px] leading-[23px] text-[var(--c-ink-muted)]">
        Mobile luxury auto detailing across Greater New Orleans. We bring the detail shop to your
        driveway — no water or power hookup needed.
      </p>

      <div className="mt-[var(--space-3xl)] flex flex-col items-center gap-[var(--space-lg)]">
        {!standalone && <InstallSheet />}
        <StatusLine standalone={standalone} />
      </div>

      <div className="flex-1" />

      <fieldset className="mt-[var(--space-3xl)] w-full border-0 p-0">
        <legend className="eyebrow mb-[var(--space-md)] w-full text-center text-[var(--c-ink-subtle)]">
          Appearance
        </legend>
        <div
          role="radiogroup"
          aria-label="Appearance"
          className="flex gap-[var(--space-xs)] rounded-[var(--radius-full)] border border-[var(--c-hairline)] p-[var(--space-xs)]"
        >
          {(['light', 'dark', 'system'] as const).map((option) => (
            <ThemeOption
              key={option}
              option={option}
              active={preference === option}
              onSelect={setPreference}
            />
          ))}
        </div>
      </fieldset>

      <p className="tabular mt-[var(--space-xl)] text-center text-[12px] leading-[16px] text-[var(--c-ink-subtle)]">
        Beta {__APP_VERSION__} · build {__BUILD_ID__}
      </p>

      <UpdatePrompt />
    </main>
  );
}

function ThemeOption({
  option,
  active,
  onSelect,
}: {
  option: ThemePreference;
  active: boolean;
  onSelect: (value: ThemePreference) => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={() => onSelect(option)}
      className="eyebrow flex-1 rounded-[var(--radius-full)] px-[var(--space-lg)] transition-colors"
      style={{
        background: active ? 'var(--c-brand)' : 'transparent',
        color: active ? 'var(--c-on-brand)' : 'var(--c-ink-muted)',
        transitionDuration: 'var(--motion-fast)',
      }}
    >
      {option}
    </button>
  );
}

/** Phase 1's success criterion, stated on screen so a tester can confirm it. */
function StatusLine({ standalone }: { standalone: boolean }) {
  return (
    <p className="text-center text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">
      {standalone ? 'Installed — running standalone.' : 'Running in the browser.'}
    </p>
  );
}
