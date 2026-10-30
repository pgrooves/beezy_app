import { Link } from 'react-router-dom';
import { LINES, type BusinessLine } from '../../core/lines';

/**
 * Names the line you are in and goes back to the front door to change it.
 * Sits in a home screen's header (DECISIONS.md#0024).
 */
export function LineSwitch({ line }: { line: BusinessLine }) {
  return (
    <Link
      to="/choose"
      aria-label={`${LINES[line].label}. Switch service`}
      className="inline-flex min-h-[var(--layout-tap-target)] items-center gap-[var(--space-sm)] rounded-[var(--radius-full)] border border-[var(--c-hairline)] bg-[var(--c-surface)] px-[var(--space-lg)] text-[13px] leading-[19px] text-[var(--c-ink)]"
    >
      {LINES[line].label}
      <svg aria-hidden width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 3.5l3 3 3-3" />
      </svg>
    </Link>
  );
}
