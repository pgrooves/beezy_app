import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, Chip, DemoNote, EmptyState, ListRow, Screen, ScreenHeader, SectionHeader } from '../../components/ui';
import { cx } from '../../components/ui/cx';
import { useSession } from '../../app/session';
import { formatDuration, formatMoney } from '../../core/pricing';
import {
  PIPELINE_BOOKINGS,
  clientById,
  jobForBooking,
  serviceById,
} from '../../core/fixtures';
import type { BookingStatus } from '../../core/types';

/** The pipeline, in the order work actually moves through it. */
const STAGES: { status: BookingStatus; label: string }[] = [
  { status: 'requested', label: 'Requested' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'en_route', label: 'En route' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'complete', label: 'Complete' },
  { status: 'paid', label: 'Paid' },
];

const dayTime = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

export default function Jobs() {
  const [stage, setStage] = useState<BookingStatus | 'all'>('all');
  const role = useSession((s) => s.role);
  const showMoney = role !== 'tech';

  const visible =
    stage === 'all' ? PIPELINE_BOOKINGS : PIPELINE_BOOKINGS.filter((b) => b.status === stage);

  return (
    <Screen>
      <ScreenHeader eyebrow="Pipeline" title={role === 'tech' ? 'My jobs' : 'Jobs'} />

      <div className="-mx-[var(--space-gutter)] mb-[var(--space-xl)] flex gap-[var(--space-sm)] overflow-x-auto px-[var(--space-gutter)] pb-[var(--space-sm)]">
        <StageChip active={stage === 'all'} onClick={() => setStage('all')} count={PIPELINE_BOOKINGS.length}>
          All
        </StageChip>
        {STAGES.map((s) => {
          const count = PIPELINE_BOOKINGS.filter((b) => b.status === s.status).length;
          if (count === 0) return null;
          return (
            <StageChip
              key={s.status}
              active={stage === s.status}
              onClick={() => setStage(s.status)}
              count={count}
            >
              {s.label}
            </StageChip>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState title="Nothing here" body="No jobs in this stage right now." />
      ) : (
        <div className="space-y-[var(--space-md)]">
          {visible.map((booking) => {
            const client = clientById(booking.clientId);
            const services = booking.serviceIds.map(serviceById).filter(Boolean);
            return (
              <Card key={booking.id} to={`/admin/jobs/${booking.id}`}>
                <div className="flex items-start justify-between gap-[var(--space-lg)]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-[var(--space-sm)]">
                      <h3 className="text-[15px] leading-[23px]">{client?.fullName ?? 'Client'}</h3>
                      {/* A booking that came through the legacy Square page
                          has no vehicle or photos yet — flagged so it gets
                          enriched rather than silently under-quoted. */}
                      {booking.squareBookingId && <Chip tone="warning">Needs details</Chip>}
                    </div>
                    <p className="mt-[2px] text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
                      {services.map((s) => s?.name).join(' + ')}
                    </p>
                    <p className="tabular mt-[var(--space-sm)] text-[12px] leading-[17px] text-[var(--c-ink-subtle)]">
                      {dayTime.format(new Date(booking.scheduledAt))} ·{' '}
                      {formatDuration(booking.durationMinutes)}
                    </p>
                  </div>
                  {showMoney && (
                    <span className="tabular shrink-0 text-[15px]">
                      {formatMoney(booking.finalCents ?? booking.totalCents)}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <DemoNote>
        Demo pipeline. Dragging between stages and the Square booking feed arrive with the
        backend.
      </DemoNote>
    </Screen>
  );
}

function StageChip({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
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
      {children} <span className="tabular opacity-60">{count}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Job detail — the checklist screen Beezy works from
// ---------------------------------------------------------------------------

export function JobDetail() {
  const { bookingId } = useParams();
  const role = useSession((s) => s.role);
  const showMoney = role !== 'tech';
  const booking = PIPELINE_BOOKINGS.find((b) => b.id === bookingId);
  const job = booking ? jobForBooking(booking.id) : undefined;
  const [checked, setChecked] = useState<Record<string, boolean>>(
    () => Object.fromEntries((job?.checklist ?? []).map((c) => [c.id, c.done])),
  );

  if (!booking) {
    return (
      <Screen>
        <ScreenHeader title="Not found" />
        <EmptyState title="No such job" body="It may have been cancelled." action={<Button to="/admin/jobs">Back to Jobs</Button>} />
      </Screen>
    );
  }

  const client = clientById(booking.clientId);
  const services = booking.serviceIds.map(serviceById).filter(Boolean);
  const items = job?.checklist ?? [];
  const doneCount = items.filter((c) => checked[c.id]).length;

  return (
    <Screen>
      <div
        style={{ paddingTop: 'max(var(--space-lg), calc(env(safe-area-inset-top) + var(--space-sm)))' }}
      >
        <Link
          to="/admin/jobs"
          className="eyebrow inline-flex items-center gap-[var(--space-sm)] py-[var(--space-md)] text-[var(--c-ink-muted)]"
        >
          ‹ Jobs
        </Link>
      </div>

      <h1 className="font-display mt-[var(--space-lg)] text-[26px] leading-[32px]">
        {client?.fullName}
      </h1>
      <p className="mt-[var(--space-xs)] text-[14px] leading-[21px] text-[var(--c-ink-muted)]">
        {services.map((s) => s?.name).join(' + ')} · {formatDuration(booking.durationMinutes)}
      </p>
      <p className="mt-[var(--space-sm)] text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">
        {booking.address.line1}, {booking.address.city}
        {booking.address.gateCode && ` · gate ${booking.address.gateCode}`}
      </p>

      <div className="mt-[var(--space-xl)] flex gap-[var(--space-md)]">
        <Button variant="secondary">Navigate</Button>
        <Button variant="secondary">Text client</Button>
      </div>

      <SectionHeader title={`Checklist · ${doneCount}/${items.length}`} />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setChecked((c) => ({ ...c, [item.id]: !c[item.id] }))}
              className="flex w-full items-center gap-[var(--space-lg)] border-b border-[var(--c-hairline)] py-[var(--space-lg)] text-left last:border-b-0"
            >
              <span
                aria-hidden
                className={cx(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors',
                  checked[item.id]
                    ? 'border-[var(--c-success)] bg-[var(--c-success)]'
                    : 'border-[var(--c-hairline)]',
                )}
                style={{ transitionDuration: 'var(--motion-fast)' }}
              >
                {checked[item.id] && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="m5 12.5 4.5 4.5L19 7.5"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cx(
                    'block text-[15px] leading-[23px]',
                    checked[item.id] && 'text-[var(--c-ink-subtle)] line-through',
                  )}
                >
                  {item.label}
                </span>
              </span>
              {item.requiresPhoto && <Chip tone="accent">Photo</Chip>}
            </button>
          ))}
        </div>
      </Card>

      {showMoney && (
        <>
          <SectionHeader title="Money" />
          <Card padded={false}>
            <div className="px-[var(--space-xl)]">
              <ListRow
                label="Estimate"
                trailing={<span className="tabular text-[14px]">{formatMoney(booking.totalCents)}</span>}
              />
              <ListRow
                label="Deposit taken"
                trailing={
                  <span className="tabular text-[14px] text-[var(--c-success)]">
                    {formatMoney(booking.depositCents)}
                  </span>
                }
              />
              {/* The customer approves this before work starts — which is how
                  Beezy already works, and it is cleaner legally than a quote
                  that silently becomes a bill. */}
              <ListRow label="Set final price" detail="Customer approves before work starts" onClick={() => {}} />
            </div>
          </Card>
        </>
      )}

      <div className="mt-[var(--space-2xl)] space-y-[var(--space-md)]">
        <Button full>Mark complete</Button>
        <Button variant="secondary" full>
          Add photos
        </Button>
      </div>

      <DemoNote>
        Ticking boxes works locally and resets on reload. Photo capture and saving state need the
        camera adapter and the backend.
      </DemoNote>
    </Screen>
  );
}
