import { useRef, useState } from 'react';
import { Chip, DemoNote, Screen, ScreenHeader } from '../../components/ui';
import { cx } from '../../components/ui/cx';
import { assetUrl } from '../../lib/assets';
import { PHOTOS, SERVICES, photoPairs } from '../../core/fixtures';

/**
 * Public portfolio plus the customer's own sets.
 *
 * Browsable signed out — guideline 5.1.1(iv) forbids gating content that does
 * not require an account, and the gallery is the best sales surface anyway.
 */
export default function Gallery() {
  const [filter, setFilter] = useState<string | null>(null);
  const pairs = photoPairs();
  const singles = PHOTOS.filter((p) => !p.pairKey && p.published);

  const filtered = filter ? pairs.filter((p) => p.serviceSlug === filter) : pairs;
  const filteredSingles = filter ? singles.filter((p) => p.serviceSlug === filter) : singles;

  return (
    <Screen>
      <ScreenHeader eyebrow="The work" title="Gallery" />

      <div className="-mx-[var(--space-gutter)] mb-[var(--space-xl)] flex gap-[var(--space-sm)] overflow-x-auto px-[var(--space-gutter)] pb-[var(--space-sm)]">
        <FilterChip active={filter === null} onClick={() => setFilter(null)}>
          Everything
        </FilterChip>
        {SERVICES.filter((s) => !s.isAddon || s.isPremium).map((service) => (
          <FilterChip
            key={service.slug}
            active={filter === service.slug}
            onClick={() => setFilter(service.slug)}
          >
            {service.name}
          </FilterChip>
        ))}
      </div>

      {filtered.length === 0 && filteredSingles.length === 0 ? (
        <p className="py-[var(--space-3xl)] text-center text-[14px] leading-[21px] text-[var(--c-ink-muted)]">
          Nothing here yet for that service.
        </p>
      ) : (
        <div className="space-y-[var(--space-2xl)]">
          {filtered.map((pair, i) => (
            <figure key={i}>
              <BeforeAfter
                before={assetUrl(pair.before.url)}
                after={assetUrl(pair.after.url)}
              />
              <figcaption className="mt-[var(--space-md)] flex items-center justify-between">
                <span className="text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
                  {SERVICES.find((s) => s.slug === pair.serviceSlug)?.name ?? 'Detail'}
                </span>
                <Chip tone="accent">Before / after</Chip>
              </figcaption>
            </figure>
          ))}

          {filteredSingles.length > 0 && (
            <div className="grid grid-cols-2 gap-[var(--space-md)]">
              {filteredSingles.map((photo) => (
                <figure key={photo.id}>
                  {/* Portrait, not square: these are shot vertically and
                      watermarked along the bottom edge, so a square crop
                      takes the logo off. */}
                  <img
                    src={assetUrl(photo.url)}
                    alt={photo.caption ?? ''}
                    loading="lazy"
                    className="aspect-[3/4] w-full rounded-[var(--radius-card)] object-cover"
                  />
                  {photo.caption && (
                    <figcaption className="mt-[var(--space-sm)] text-[12px] leading-[17px] text-[var(--c-ink-muted)]">
                      {photo.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </div>
      )}

      <DemoNote>
        Seeded from the site&rsquo;s photography. Publishing a job&rsquo;s before/after pair here —
        with the customer&rsquo;s consent — comes with the admin work.
      </DemoNote>
    </Screen>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'eyebrow shrink-0 rounded-[var(--radius-full)] border px-[var(--space-lg)] transition-colors',
        active
          ? 'border-[var(--c-brand)] bg-[var(--c-brand)] text-[var(--c-on-brand)]'
          : 'border-[var(--c-hairline)] text-[var(--c-ink-muted)]',
      )}
      style={{ transitionDuration: 'var(--motion-fast)' }}
    >
      {children}
    </button>
  );
}

/**
 * Drag-to-compare slider. The most shareable surface in the app.
 *
 * Pointer events rather than mouse/touch pairs, so one handler covers finger,
 * stylus and trackpad. The control is also a real range input underneath for
 * keyboard and VoiceOver, which a div with a drag handler can never be.
 */
export function BeforeAfter({ before, after }: { before: string; after: string }) {
  const [position, setPosition] = useState(50);
  const frame = useRef<HTMLDivElement>(null);

  const setFromClientX = (clientX: number) => {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;
    setPosition(Math.min(100, Math.max(0, ((clientX - box.left) / box.width) * 100)));
  };

  return (
    <div
      ref={frame}
      className="relative aspect-[4/3] w-full touch-none overflow-hidden rounded-[var(--radius-card)] bg-[var(--c-surface-alt)]"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons > 0) setFromClientX(e.clientX);
      }}
    >
      <img src={after} alt="After" className="absolute inset-0 h-full w-full object-cover" />
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        {/* Sized to the frame, not the clip, so the image does not squash as
            the divider moves. */}
        <img
          src={before}
          alt="Before"
          className="absolute inset-y-0 left-0 h-full max-w-none object-cover"
          style={{ width: frame.current?.clientWidth ?? '100%' }}
        />
      </div>

      <div
        aria-hidden
        className="absolute inset-y-0 w-[2px] bg-white/90"
        style={{ left: `${position}%` }}
      >
        <span className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--c-ink)] shadow-[var(--shadow-card)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="m10 8-4 4 4 4M14 8l4 4-4 4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      <label className="sr-only" htmlFor="ba-slider">
        Compare before and after
      </label>
      <input
        id="ba-slider"
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        className="absolute inset-x-0 bottom-0 h-11 w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
