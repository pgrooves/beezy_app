import { Card, Chip, DemoNote, Screen, ScreenHeader, SectionHeader, Stat } from '../../components/ui';
import { cx } from '../../components/ui/cx';
import { useSession } from '../../app/session';
import { formatDuration, formatMoney } from '../../core/pricing';
import { TODAY_BOOKINGS, clientById, jobForBooking, serviceById } from '../../core/fixtures';
import type { Booking, BookingStatus } from '../../core/types';

const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

const STATUS_TONE: Record<BookingStatus, 'neutral' | 'accent' | 'success' | 'warning'> = {
  requested: 'warning',
  confirmed: 'neutral',
  en_route: 'accent',
  in_progress: 'accent',
  complete: 'success',
  paid: 'success',
  cancelled: 'neutral',
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: 'Requested',
  confirmed: 'Next',
  en_route: 'En route',
  in_progress: 'In progress',
  complete: 'Done',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

/**
 * The day, in the order Beezy will actually drive it.
 *
 * Revenue is hidden from techs — the role model says they see assigned work
 * and nothing financial, and that is enforced here rather than by hiding a
 * tab.
 */
export default function Today() {
  const role = useSession((s) => s.role);
  const showMoney = role !== 'tech';

  const booked = TODAY_BOOKINGS.reduce((sum, b) => sum + (b.finalCents ?? b.totalCents), 0);
  const collected = TODAY_BOOKINGS.filter((b) => b.status === 'paid' || b.status === 'complete').reduce(
    (sum, b) => sum + (b.finalCents ?? b.totalCents),
    0,
  );
  const remaining = TODAY_BOOKINGS.filter((b) => b.status !== 'complete' && b.status !== 'paid');

  return (
    <Screen>
      <ScreenHeader
        eyebrow={new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        }).format(new Date())}
        title="Today"
      />

      {showMoney && (
        <Card>
          <div className="flex items-start justify-between gap-[var(--space-lg)]">
            <Stat value={formatMoney(booked)} label="booked today" />
            <Stat value={formatMoney(collected)} label="collected" tone="accent" />
            <Stat value={`${remaining.length}`} label="stops left" />
          </div>
        </Card>
      )}

      <SectionHeader title={`Route · ${TODAY_BOOKINGS.length} stops`} />
      <div className="space-y-[var(--space-lg)]">
        {TODAY_BOOKINGS.map((booking, i) => (
          <JobCard
            key={booking.id}
            booking={booking}
            index={i + 1}
            showMoney={showMoney}
            driveMinutes={i === 0 ? undefined : 12 + i * 3}
          />
        ))}
      </div>

      <DemoNote>
        Demo data. Live drive times and the next-stop handoff to Maps need a maps provider —
        third-party work saved for later.
      </DemoNote>
    </Screen>
  );
}

export function JobCard({
  booking,
  index,
  showMoney,
  driveMinutes,
}: {
  booking: Booking;
  index?: number;
  showMoney: boolean;
  driveMinutes?: number;
}) {
  const client = clientById(booking.clientId);
  const services = booking.serviceIds.map(serviceById).filter(Boolean);
  const job = jobForBooking(booking.id);
  const done = job?.checklist.filter((c) => c.done).length ?? 0;
  const total = job?.checklist.length ?? 0;

  return (
    <>
      {driveMinutes !== undefined && (
        <p className="tabular pl-[var(--space-lg)] text-[12px] leading-[17px] text-[var(--c-ink-subtle)]">
          ↓ {driveMinutes} min drive
        </p>
      )}
      <Card to={`/admin/jobs/${booking.id}`} padded={false}>
        <div className="flex items-center justify-between border-b border-[var(--c-hairline)] px-[var(--space-xl)] py-[var(--space-md)]">
          <span className="tabular eyebrow text-[var(--c-ink-subtle)]">
            {index !== undefined && `${index} · `}
            {time.format(new Date(booking.scheduledAt))}
          </span>
          <Chip tone={STATUS_TONE[booking.status]}>{STATUS_LABEL[booking.status]}</Chip>
        </div>
        <div className="px-[var(--space-xl)] py-[var(--space-lg)]">
          <h3 className="text-[17px] leading-[26px]">{client?.fullName ?? 'Client'}</h3>
          <p className="mt-[2px] text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
            {services.map((s) => s?.name).join(' + ')} · {formatDuration(booking.durationMinutes)}
          </p>
          <p className="mt-[var(--space-sm)] text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">
            {booking.address.line1}
          </p>

          <div className="mt-[var(--space-lg)] flex items-center justify-between gap-[var(--space-lg)]">
            {total > 0 ? (
              <div className="flex flex-1 items-center gap-[var(--space-md)]">
                <div className="h-[3px] flex-1 rounded-full bg-[var(--c-hairline)]">
                  <div
                    className={cx(
                      'h-full rounded-full',
                      done === total ? 'bg-[var(--c-success)]' : 'bg-[var(--c-accent)]',
                    )}
                    style={{ width: `${(done / total) * 100}%` }}
                  />
                </div>
                <span className="tabular text-[12px] text-[var(--c-ink-subtle)]">
                  {done}/{total}
                </span>
              </div>
            ) : (
              <span className="flex-1 text-[12px] text-[var(--c-ink-subtle)]">Not started</span>
            )}
            {showMoney && (
              <span className="tabular shrink-0 text-[15px]">
                {formatMoney(booking.finalCents ?? booking.totalCents)}
              </span>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
