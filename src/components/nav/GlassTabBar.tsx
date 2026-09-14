import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { platform } from '../../lib/platform';
import { cx } from '../ui/cx';
import type { TabDef } from '../../app/routes';

/**
 * Liquid Glass bottom navigation.
 *
 * A floating capsule hovering above the safe-area inset, not a docked bar.
 * Content scrolls underneath and stays visible through it — the translucency
 * is the whole effect, so the bar is never allowed to go opaque except where
 * an accessibility setting demands it (handled in src/styles.css).
 *
 * The active pill is a single absolutely-positioned element that springs
 * between tab positions rather than each tab toggling its own background.
 * That is what makes the movement read as one object rather than a cut.
 */
export function GlassTabBar({
  tabs,
  onMore,
  moreOpen,
}: {
  tabs: TabDef[];
  onMore: () => void;
  moreOpen: boolean;
}) {
  const location = useLocation();
  const barRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(platform.appearance.prefersReducedMotion());
  }, []);

  // Index of the item the pill should sit under: a matching tab, or More.
  const activeIndex = moreOpen
    ? tabs.length
    : tabs.findIndex((tab) =>
        tab.end ? location.pathname === tab.path : location.pathname.startsWith(tab.path),
      );

  // Measured rather than computed from a fraction, because the More button is
  // narrower than a tab and the pill has to match whatever it lands on.
  useLayoutEffect(() => {
    const el = itemRefs.current[activeIndex];
    const bar = barRef.current;
    if (!el || !bar) {
      setPill(null);
      return;
    }
    const barBox = bar.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    setPill({ left: box.left - barBox.left, width: box.width });
  }, [activeIndex, tabs.length, location.pathname]);

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-[var(--space-lg)]"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + var(--layout-nav-float))' }}
    >
      <div
        ref={barRef}
        className="glass pointer-events-auto relative flex w-full max-w-[var(--layout-content-max)] items-stretch rounded-[var(--radius-full)] p-[var(--space-xs)]"
        style={{ height: 'var(--layout-nav-height)' }}
      >
        {pill && (
          <span
            aria-hidden
            className="absolute rounded-[var(--radius-full)] bg-[var(--c-accent-pill)]"
            style={{
              left: pill.left,
              width: pill.width,
              top: 'var(--space-xs)',
              bottom: 'var(--space-xs)',
              // An edge rather than a heavier wash: over glass, a solid tint
              // loses its shape and reads as a gold blob.
              boxShadow: 'inset 0 0 0 1px var(--c-accent-pill-edge)',
              transition: reduceMotion
                ? 'opacity var(--motion-fast) linear'
                : 'left var(--motion-base) var(--motion-spring), width var(--motion-base) var(--motion-spring)',
            }}
          />
        )}

        {tabs.map((tab, i) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.end}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            onClick={() => platform.haptics.selection()}
            className={({ isActive }) =>
              cx(
                'relative z-10 flex flex-1 flex-col items-center justify-center gap-[4px] rounded-[var(--radius-full)]',
                isActive && !moreOpen ? 'text-[var(--c-accent-text)]' : 'text-[var(--c-ink-muted)]',
              )
            }
          >
            <TabIcon name={tab.icon} />
            <span className="nav-label" style={{ minHeight: 0 }}>
              {tab.label}
            </span>
          </NavLink>
        ))}

        <button
          type="button"
          onClick={() => {
            platform.haptics.selection();
            onMore();
          }}
          aria-expanded={moreOpen}
          aria-label="More"
          ref={(el) => {
            itemRefs.current[tabs.length] = el;
          }}
          className={cx(
            'relative z-10 flex w-[56px] flex-col items-center justify-center gap-[4px] rounded-[var(--radius-full)]',
            moreOpen ? 'text-[var(--c-accent-text)]' : 'text-[var(--c-ink-muted)]',
          )}
        >
          <TabIcon name="more" />
          <span className="nav-label" style={{ minHeight: 0 }}>
            More
          </span>
        </button>
      </div>
    </nav>
  );
}

export type IconName =
  | 'home'
  | 'book'
  | 'garage'
  | 'gallery'
  | 'today'
  | 'schedule'
  | 'jobs'
  | 'clients'
  | 'more';

/**
 * Inline SVG rather than an icon font: no extra network request, and stroke
 * colour inherits so the active state needs no second asset.
 */
export function TabIcon({ name, size = 22 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    // A bigger glyph carrying a lighter line. At 1.6 on a 24 grid the stroke
    // was 7% of the icon's own height, which reads as clip art next to type
    // this light — the rest of the app is set at 300–500 weight.
    strokeWidth: 1.25,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V20h13V9.5" />
        </svg>
      );
    case 'book':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case 'garage':
      return (
        <svg {...common}>
          <path d="M3 20V9l9-5 9 5v11" />
          <path d="M7 20v-6h10v6" />
        </svg>
      );
    case 'gallery':
      return (
        <svg {...common}>
          <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
          <path d="m3.5 16 5-4.5 4 3.5 3-2.5 5 4" />
          <circle cx="8.5" cy="9" r="1.2" />
        </svg>
      );
    case 'today':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5.5l3.5 2" />
        </svg>
      );
    case 'schedule':
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
          <path d="M3.5 10h17M8 3.5v3M16 3.5v3" />
        </svg>
      );
    case 'jobs':
      return (
        <svg {...common}>
          <rect x="3.5" y="4.5" width="6" height="15" rx="1.8" />
          <rect x="14.5" y="4.5" width="6" height="9" rx="1.8" />
        </svg>
      );
    case 'clients':
      return (
        <svg {...common}>
          <circle cx="9" cy="8.5" r="3.5" />
          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          <path d="M16 5.5a3.5 3.5 0 0 1 0 6.6M17.5 14.4A6 6 0 0 1 21 20" />
        </svg>
      );
    case 'more':
      return (
        <svg {...common}>
          {/* Filled, so they carry more weight per pixel than a stroked
              glyph — sized down to sit level with the 1.25 strokes. */}
          <circle cx="5.5" cy="12" r="1.25" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
          <circle cx="18.5" cy="12" r="1.25" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
