import { Link } from 'react-router-dom';
import { Button, Card, Chip, EmptyState, Screen, ScreenHeader, SectionHeader } from '../../components/ui';
import { useBookings, useServices } from '../../app/data';
import { STATUS_LABEL, nextBooking, pastBookings } from '../../core/rows';
import { useSession } from '../../app/session';
import { firstName } from '../../core/profile';
import { assetUrl } from '../../lib/assets';
import { formatMoney } from '../../core/pricing';
import { photoPairs } from '../../core/fixtures';
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
  const status = useSession((s) => s.status);
  const profile = useSession((s) => s.profile);

  // Nothing until the stored session is read back, so a signed-in customer
  // never sees the signed-out welcome flash past on launch.
  if (status === 'loading') return null;
  if (status !== 'signedIn') return <Welcome />;

  const name = profile ? firstName(profile) : '';
  return (
    <Screen>
      <ScreenHeader eyebrow="Good to see you" title={name || 'Welcome back'} />
      <div className="h-[var(--space-lg)]" />
      <SignedInHome />
    </Screen>
  );
}

function SignedInHome() {
  const { bookings, state, retry } = useBookings();
  const { services } = useServices();
  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? 'Service';

  if (state === 'error') {
    return (
      <EmptyState
        title="Couldn’t load your bookings"
        body="Check your connection and try again."
        action={<Button onClick={retry}>Try again</Button>}
      />
    );
  }
  if (state !== 'ready') return null;

  const next = nextBooking(bookings);
  const last = pastBookings(bookings)[0];

  return (
    <>
      {next ? <NextAppointment booking={next} serviceName={serviceName} /> : <NoAppointment />}

      <div className="mt-[var(--space-lg)]">
        <Button to="/book" full>
          Book a detail
        </Button>
      </div>

      {last && (
        <>
          <SectionHeader title="Last service" />
          <LastService booking={last} serviceName={serviceName} />
        </>
      )}
    </>
  );
}

/**
 * Signed out. The gallery, menu and About stay open (guideline 5.1.1(iv));
 * this is the front door to them and to signing in.
 */
function Welcome() {
  const pair = photoPairs()[0];
  return (
    <Screen>
      <ScreenHeader eyebrow="Mobile detailing" title="Beezy" />

      <p className="mt-[var(--space-lg)] text-[17px] leading-[26px] text-[var(--c-ink-muted)]">
        Make life easy, call Beezy. We come to your driveway anywhere in Greater New Orleans —
        no water or power needed.
      </p>

      {pair && (
        <div className="mt-[var(--space-xl)] overflow-hidden rounded-[var(--radius-card)]">
          <img
            src={assetUrl(pair.after.url)}
            alt="A freshly detailed car"
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      )}

      <div className="mt-[var(--space-xl)] space-y-[var(--space-md)]">
        <Button to="/sign-in" full>
          Sign in to book
        </Button>
        <Button to="/gallery" variant="secondary" full>
          See the work
        </Button>
      </div>

      <SectionHeader title="Beezy" />
      <Card padded={false}>
        <div className="flex flex-col px-[var(--space-xl)]">
          <Link to="/about" className="border-b border-[var(--c-hairline)] py-[var(--space-lg)] text-[15px] leading-[23px]">
            About Beezy
          </Link>
          <Link to="/service-area" className="border-b border-[var(--c-hairline)] py-[var(--space-lg)] text-[15px] leading-[23px]">
            Service area
          </Link>
          <Link to="/faq" className="py-[var(--space-lg)] text-[15px] leading-[23px]">
            FAQ
          </Link>
        </div>
      </Card>
    </Screen>
  );
}

function NextAppointment({ booking, serviceName }: { booking: Booking; serviceName: (id: string) => string }) {
  const when = new Date(booking.scheduledAt);
  const confirmed = booking.status !== 'requested';

  return (
    <Card to={`/booking/${booking.id}`} padded={false}>
      <div className="flex items-center justify-between border-b border-[var(--c-hairline)] px-[var(--space-xl)] py-[var(--space-lg)]">
        <span className="eyebrow text-[var(--c-accent-text)]">{countdown(booking.scheduledAt)}</span>
        <Chip tone={confirmed ? 'success' : 'warning'}>{STATUS_LABEL[booking.status]}</Chip>
      </div>
      <div className="px-[var(--space-xl)] py-[var(--space-xl)]">
        <p className="font-display text-[24px] leading-[30px]">{dayFormat.format(when)}</p>
        <p className="tabular mt-[var(--space-xs)] text-[15px] leading-[23px] text-[var(--c-ink-muted)]">
          {timeFormat.format(when)} · {booking.serviceIds.map(serviceName).join(' + ')}
        </p>
        <p className="mt-[var(--space-lg)] text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">
          {booking.vehicleLabel} · {booking.address.line1}
        </p>
        {!confirmed && (
          <p className="mt-[var(--space-sm)] text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">
            Waiting for Beezy to confirm the time.
          </p>
        )}
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

function LastService({ booking, serviceName }: { booking: Booking; serviceName: (id: string) => string }) {
  return (
    <Card padded={false}>
      <div className="px-[var(--space-xl)] py-[var(--space-xl)]">
        <p className="font-display text-[18px] leading-[24px]">
          {booking.serviceIds.map(serviceName).join(' + ')}
        </p>
        <p className="tabular mt-[var(--space-xs)] text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
          {dayFormat.format(new Date(booking.scheduledAt))} · {booking.vehicleLabel} ·{' '}
          {formatMoney(booking.finalCents ?? booking.totalCents)}
        </p>
        <div className="mt-[var(--space-xl)] flex gap-[var(--space-md)]">
          <Button to={`/booking/${booking.id}`} variant="secondary">
            Details
          </Button>
          <Link
            to="/book"
            className="eyebrow flex items-center px-[var(--space-lg)] text-[var(--c-ink-muted)]"
          >
            Book again
          </Link>
        </div>
      </div>
    </Card>
  );
}
