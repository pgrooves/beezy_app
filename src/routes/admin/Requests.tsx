import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Chip,
  DetailHeader,
  EmptyState,
  FormMessage,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
} from '../../components/ui';
import { useData, useRequests, useServices } from '../../app/data';
import { CONDITION_COPY, formatDuration, formatMoney } from '../../core/pricing';
import { STATUS_LABEL } from '../../core/rows';
import type { BookingStatus } from '../../core/types';

const when = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const TONE: Record<BookingStatus, 'warning' | 'success' | 'accent' | 'neutral'> = {
  requested: 'warning',
  confirmed: 'success',
  en_route: 'accent',
  in_progress: 'accent',
  complete: 'success',
  paid: 'success',
  cancelled: 'neutral',
};

/**
 * Real bookings coming in from customers, on Beezy's Today screen.
 *
 * The rest of the admin portal is still demo data until Phase 5 builds the
 * schedule and jobs pipeline; this is the one part that has to be live as
 * soon as customers can book, or a request lands nowhere.
 */
export function RequestsSection() {
  const { requests, state, retry } = useRequests();
  const { services } = useServices();
  const name = (id: string) => services.find((s) => s.id === id)?.name ?? 'Service';
  const pending = requests.filter((r) => r.status === 'requested').length;

  return (
    <>
      <SectionHeader title={pending ? `Requests · ${pending} to confirm` : 'Upcoming bookings'} />
      {state === 'error' ? (
        <EmptyState
          title="Couldn’t load bookings"
          body="Check your connection and try again."
          action={<Button onClick={retry}>Try again</Button>}
        />
      ) : state !== 'ready' ? (
        <p className="text-[14px] text-[var(--c-ink-subtle)]">Loading…</p>
      ) : requests.length === 0 ? (
        <Card>
          <p className="text-[14px] leading-[21px] text-[var(--c-ink-muted)]">
            No upcoming bookings from the app yet. New requests appear here.
          </p>
        </Card>
      ) : (
        <Card padded={false}>
          <div className="px-[var(--space-xl)]">
            {requests.map((r) => (
              <ListRow
                key={r.id}
                to={`/admin/requests/${r.id}`}
                label={`${r.client?.fullName || r.client?.email || 'Customer'} · ${r.serviceIds.map(name).join(' + ')}`}
                detail={`${when.format(new Date(r.scheduledAt))} · ${r.vehicleLabel}`}
                trailing={<Chip tone={TONE[r.status]}>{STATUS_LABEL[r.status]}</Chip>}
              />
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

export function RequestDetail() {
  const { bookingId } = useParams();
  const { requests, state } = useRequests();
  const { services } = useServices();
  const setBookingStatus = useData((s) => s.setBookingStatus);
  const photoUrls = useData((s) => s.photoUrls);
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<{ slot: string | null; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const booking = requests.find((r) => r.id === bookingId);

  useEffect(() => {
    if (!bookingId) return;
    let live = true;
    void photoUrls(bookingId).then((urls) => live && setPhotos(urls));
    return () => {
      live = false;
    };
  }, [bookingId, photoUrls]);

  if (state !== 'ready') return <Screen><DetailHeader to="/admin" label="Today" /></Screen>;
  if (!booking) {
    return (
      <Screen>
        <ScreenHeader title="Not found" />
        <EmptyState
          title="No such booking"
          body="It may have been cancelled or already finished."
          action={<Button to="/admin">Back to Today</Button>}
        />
      </Screen>
    );
  }

  const move = async (status: BookingStatus) => {
    setBusy(true);
    setError(null);
    const result = await setBookingStatus(booking.id, status);
    setBusy(false);
    if (result.error) setError(result.error);
    else if (status === 'cancelled') navigate('/admin', { replace: true });
  };

  const names = booking.serviceIds.map((id) => services.find((s) => s.id === id)?.name ?? 'Service');
  const a = booking.address;

  return (
    <Screen>
      <DetailHeader to="/admin" label="Today" />
      <h1 className="font-display mt-[var(--space-lg)] text-[28px] leading-[34px]">
        {booking.client?.fullName || booking.client?.email || 'Customer'}
      </h1>
      <p className="tabular mt-[var(--space-sm)] text-[15px] leading-[23px] text-[var(--c-ink-muted)]">
        {when.format(new Date(booking.scheduledAt))} · {formatDuration(booking.durationMinutes)}
      </p>
      <div className="mt-[var(--space-lg)]">
        <Chip tone={TONE[booking.status]}>{STATUS_LABEL[booking.status]}</Chip>
      </div>

      <SectionHeader title="Job" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          <ListRow label="Service" trailing={<span className="text-right text-[14px] text-[var(--c-ink-muted)]">{names.join(' + ')}</span>} />
          <ListRow label="Vehicle" trailing={<span className="text-right text-[14px] text-[var(--c-ink-muted)]">{booking.vehicleLabel}</span>} />
          <ListRow label="Condition" trailing={<span className="text-[14px] text-[var(--c-ink-muted)]">{CONDITION_COPY[booking.condition].label}</span>} />
          <ListRow
            label={booking.needsReview ? 'Estimate · needs your review' : 'Estimate'}
            trailing={<span className="tabular text-[14px]">{formatMoney(booking.totalCents)}</span>}
          />
        </div>
      </Card>

      <SectionHeader title="Where" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          <ListRow
            label={[a.line1, a.line2].filter(Boolean).join(', ')}
            detail={[a.city, a.postalCode].filter(Boolean).join(' ')}
          />
          {a.gateCode && <ListRow label="Gate code" trailing={<span className="tabular text-[14px]">{a.gateCode}</span>} />}
          {a.parkingNotes && <ListRow label="Parking" detail={a.parkingNotes} />}
          <ListRow label="Covered parking" trailing={<span className="text-[14px] text-[var(--c-ink-muted)]">{a.covered ? 'Yes' : 'No'}</span>} />
          {a.lat !== undefined && a.lng !== undefined && (
            <a
              href={`https://maps.apple.com/?daddr=${a.lat},${a.lng}`}
              target="_blank"
              rel="noopener"
              className="flex items-center border-b border-[var(--c-hairline)] py-[var(--space-lg)] text-[15px] last:border-b-0"
            >
              Customer dropped a pin · Directions ›
            </a>
          )}
        </div>
      </Card>

      <SectionHeader title="Contact" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          {booking.client?.phone ? (
            <a href={`sms:${booking.client.phone}`} className="flex items-center justify-between border-b border-[var(--c-hairline)] py-[var(--space-lg)] text-[15px]">
              <span>Text {booking.client.phone}</span>
              <span aria-hidden className="text-[var(--c-ink-subtle)]">›</span>
            </a>
          ) : (
            <ListRow label="No phone on file" detail="Ask them to add one in Profile." />
          )}
          {booking.client?.email && (
            <a href={`mailto:${booking.client.email}`} className="flex items-center justify-between py-[var(--space-lg)] text-[15px]">
              <span>{booking.client.email}</span>
              <span aria-hidden className="text-[var(--c-ink-subtle)]">›</span>
            </a>
          )}
        </div>
      </Card>

      {photos.length > 0 && (
        <>
          <SectionHeader title="Condition photos" />
          <div className="grid grid-cols-2 gap-[var(--space-md)]">
            {photos.map((p) => (
              <a key={p.url} href={p.url} target="_blank" rel="noopener">
                <img
                  src={p.url}
                  alt={p.slot ? `Condition: ${p.slot.replace('_', ' ')}` : 'Condition photo'}
                  className="aspect-[4/3] w-full rounded-[var(--radius-card)] object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </>
      )}

      {error && <FormMessage>{error}</FormMessage>}
      <div className="mt-[var(--space-2xl)] space-y-[var(--space-md)]">
        {booking.status === 'requested' && (
          <Button full disabled={busy} onClick={() => void move('confirmed')}>
            Confirm this time
          </Button>
        )}
        {(booking.status === 'requested' || booking.status === 'confirmed') && (
          <Button variant="secondary" full disabled={busy} onClick={() => void move('cancelled')}>
            {booking.status === 'requested' ? 'Decline' : 'Cancel booking'}
          </Button>
        )}
      </div>
      <p className="mt-[var(--space-lg)] text-[12px] leading-[17px] text-[var(--c-ink-subtle)]">
        Confirming doesn&rsquo;t message the customer yet — text them too. Confirmation emails and
        calendar sync come with the next phase.
      </p>
    </Screen>
  );
}
