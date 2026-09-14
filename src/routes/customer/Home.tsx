import { Link } from 'react-router-dom';
import { Button, Card, Chip, Screen, ScreenHeader, SectionHeader, Stat } from '../../components/ui';
import { assetUrl } from '../../lib/assets';
import { formatMoney } from '../../core/pricing';
import {
  BOOKINGS,
  DEMO_SUBSCRIPTION,
  PLANS,
  photoPairs,
  serviceById,
  vehicleById,
} from '../../core/fixtures';
import type { Booking } from '../../core/types';

const dayFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

function countdown(iso: string): string {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export default function Home() {
  const next = BOOKINGS.find((b) => b.status === 'confirmed');
  const past = BOOKINGS.filter((b) => b.status === 'paid');
  const lastService = past[0];
  const plan = PLANS.find((p) => p.tier === DEMO_SUBSCRIPTION.planTier);
  const pair = photoPairs()[0];

  return (
    <Screen>
      <ScreenHeader eyebrow="Good to see you" title="Marcus" />

      <div className="h-[var(--space-lg)]" />

      {next ? <NextAppointment booking={next} /> : <NoAppointment />}

      <div className="mt-[var(--space-lg)]">
        <Button to="/book" full>
          Book a detail
        </Button>
      </div>

      {plan && (
        <>
          <SectionHeader title="Membership" action={{ label: 'Manage', to: '/plan' }} />
          <Card>
            <div className="flex items-start justify-between gap-[var(--space-lg)]">
              <div>
                <div className="flex items-center gap-[var(--space-sm)]">
                  <h3 className="font-display text-[20px] leading-[26px]">{plan.name}</h3>
                  <Chip tone="accent">Active</Chip>
                </div>
                <p className="mt-[var(--space-xs)] text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
                  Renews {dayFormat.format(new Date(DEMO_SUBSCRIPTION.renewsAt))}
                </p>
              </div>
              <Stat
                tone="accent"
                value={`${DEMO_SUBSCRIPTION.creditsRemaining}`}
                label={`of ${DEMO_SUBSCRIPTION.creditsPerCycle} left`}
              />
            </div>
          </Card>
        </>
      )}

      {lastService && (
        <>
          <SectionHeader title="Last service" />
          <LastService booking={lastService} beforeAfter={pair} />
        </>
      )}
    </Screen>
  );
}

function NextAppointment({ booking }: { booking: Booking }) {
  const vehicle = vehicleById(booking.vehicleId);
  const services = booking.serviceIds.map(serviceById).filter(Boolean);
  const when = new Date(booking.scheduledAt);

  return (
    <Card to={`/booking/${booking.id}`} padded={false}>
      <div className="flex items-center justify-between border-b border-[var(--c-hairline)] px-[var(--space-xl)] py-[var(--space-lg)]">
        <span className="eyebrow text-[var(--c-accent-text)]">{countdown(booking.scheduledAt)}</span>
        <Chip tone="success">Confirmed</Chip>
      </div>
      <div className="px-[var(--space-xl)] py-[var(--space-xl)]">
        <p className="font-display text-[24px] leading-[30px]">
          {dayFormat.format(when)}
        </p>
        <p className="tabular mt-[var(--space-xs)] text-[15px] leading-[23px] text-[var(--c-ink-muted)]">
          {timeFormat.format(when)} · {services.map((s) => s?.name).join(' + ')}
        </p>
        <p className="mt-[var(--space-lg)] text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">
          {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicle'} ·{' '}
          {booking.address.line1}
        </p>
      </div>
    </Card>
  );
}

function NoAppointment() {
  return (
    <Card>
      <p className="font-display text-[20px] leading-[26px]">No appointment booked</p>
      <p className="mt-[var(--space-sm)] text-[14px] leading-[21px] text-[var(--c-ink-muted)]">
        Beezy comes to you — driveway, office lot, wherever the car is sitting.
      </p>
    </Card>
  );
}

function LastService({
  booking,
  beforeAfter,
}: {
  booking: Booking;
  beforeAfter?: { before: { url: string }; after: { url: string } };
}) {
  const vehicle = vehicleById(booking.vehicleId);
  const services = booking.serviceIds.map(serviceById).filter(Boolean);

  return (
    <Card padded={false}>
      {beforeAfter && (
        <div className="grid grid-cols-2 gap-[2px] bg-[var(--c-hairline)]">
          <figure className="relative">
            <img
              src={assetUrl(beforeAfter.before.url)}
              alt="Before"
              className="aspect-[4/3] w-full object-cover"
              loading="lazy"
            />
            <figcaption className="eyebrow absolute bottom-[var(--space-sm)] left-[var(--space-sm)] rounded-[var(--radius-full)] bg-[var(--c-scrim)] px-[var(--space-md)] py-[2px] text-[9px] text-white">
              Before
            </figcaption>
          </figure>
          <figure className="relative">
            <img
              src={assetUrl(beforeAfter.after.url)}
              alt="After"
              className="aspect-[4/3] w-full object-cover"
              loading="lazy"
            />
            <figcaption className="eyebrow absolute bottom-[var(--space-sm)] left-[var(--space-sm)] rounded-[var(--radius-full)] bg-[var(--c-scrim)] px-[var(--space-md)] py-[2px] text-[9px] text-white">
              After
            </figcaption>
          </figure>
        </div>
      )}
      <div className="px-[var(--space-xl)] py-[var(--space-xl)]">
        <p className="font-display text-[18px] leading-[24px]">
          {services.map((s) => s?.name).join(' + ')}
        </p>
        <p className="tabular mt-[var(--space-xs)] text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
          {dayFormat.format(new Date(booking.scheduledAt))} ·{' '}
          {vehicle ? `${vehicle.make} ${vehicle.model}` : ''} ·{' '}
          {formatMoney(booking.finalCents ?? booking.totalCents)}
        </p>
        <div className="mt-[var(--space-xl)] flex gap-[var(--space-md)]">
          <Button to="/book" variant="secondary">
            Book this again
          </Button>
          <Link
            to="/gallery"
            className="eyebrow flex items-center px-[var(--space-lg)] text-[var(--c-ink-muted)]"
          >
            See all
          </Link>
        </div>
      </div>
    </Card>
  );
}
