import { useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Chip,
  DemoNote,
  DetailHeader,
  EmptyState,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
  Stat,
} from '../../components/ui';
import { cx } from '../../components/ui/cx';
import { assetUrl } from '../../lib/assets';
import { useAppearance, type ThemePreference } from '../../theme/useAppearance';
import { formatMoney } from '../../core/pricing';
import {
  BOOKINGS,
  DEMO_SUBSCRIPTION,
  PAYMENTS,
  PLANS,
  serviceById,
  vehicleById,
} from '../../core/fixtures';

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const longDate = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

// ---------------------------------------------------------------------------
// Booking detail
// ---------------------------------------------------------------------------

export function BookingDetail() {
  const { bookingId } = useParams();
  const booking = BOOKINGS.find((b) => b.id === bookingId);

  if (!booking) {
    return (
      <Screen>
        <ScreenHeader title="Not found" />
        <EmptyState title="No such booking" body="It may have been cancelled." action={<Button to="/">Home</Button>} />
      </Screen>
    );
  }

  const vehicle = vehicleById(booking.vehicleId);
  const services = booking.serviceIds.map(serviceById).filter(Boolean);
  const upcoming = booking.status === 'confirmed';

  return (
    <Screen>
      <DetailHeader to="/" label="Home" />
      <h1 className="font-display mt-[var(--space-lg)] text-[28px] leading-[34px]">
        {services.map((s) => s?.name).join(' + ')}
      </h1>
      <p className="tabular mt-[var(--space-sm)] text-[15px] leading-[23px] text-[var(--c-ink-muted)]">
        {longDate.format(new Date(booking.scheduledAt))}
      </p>
      <div className="mt-[var(--space-lg)]">
        <Chip tone={upcoming ? 'success' : 'neutral'}>
          {upcoming ? 'Confirmed' : booking.status === 'paid' ? 'Complete' : booking.status}
        </Chip>
      </div>

      <SectionHeader title="Details" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          <ListRow
            label="Vehicle"
            trailing={
              <span className="text-[14px] text-[var(--c-ink-muted)]">
                {vehicle ? `${vehicle.make} ${vehicle.model}` : '—'}
              </span>
            }
          />
          <ListRow
            label="Where"
            trailing={
              <span className="text-right text-[14px] text-[var(--c-ink-muted)]">
                {booking.address.line1}
              </span>
            }
          />
          {booking.address.gateCode && (
            <ListRow
              label="Gate code"
              trailing={
                <span className="tabular text-[14px] text-[var(--c-ink-muted)]">
                  {booking.address.gateCode}
                </span>
              }
            />
          )}
          <ListRow
            label={booking.finalCents ? 'Paid' : 'Estimate'}
            trailing={
              <span className="tabular text-[14px]">
                {formatMoney(booking.finalCents ?? booking.totalCents)}
              </span>
            }
          />
        </div>
      </Card>

      {upcoming && (
        <div className="mt-[var(--space-2xl)] space-y-[var(--space-md)]">
          <Button variant="secondary" full>
            Reschedule
          </Button>
          <Button variant="ghost" full>
            Cancel booking
          </Button>
        </div>
      )}
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export function PlanScreen() {
  const current = PLANS.find((p) => p.tier === DEMO_SUBSCRIPTION.planTier);

  return (
    <Screen>
      <ScreenHeader eyebrow="Membership" title="Your plan" />

      {current && (
        <Card>
          <div className="flex items-start justify-between gap-[var(--space-lg)]">
            <div>
              <div className="flex items-center gap-[var(--space-sm)]">
                <h2 className="font-display text-[22px] leading-[28px]">{current.name}</h2>
                <Chip tone="accent">Active</Chip>
              </div>
              <p className="tabular mt-[var(--space-xs)] text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
                {formatMoney(current.priceCents)}/month · renews{' '}
                {dateFormat.format(new Date(DEMO_SUBSCRIPTION.renewsAt))}
              </p>
            </div>
            <Stat
              tone="accent"
              value={`${DEMO_SUBSCRIPTION.creditsRemaining}`}
              label="washes left"
            />
          </div>
          <ul className="mt-[var(--space-xl)] space-y-[var(--space-sm)] border-t border-[var(--c-hairline)] pt-[var(--space-lg)]">
            {current.benefits.map((benefit) => (
              <li
                key={benefit}
                className="flex gap-[var(--space-sm)] text-[14px] leading-[21px] text-[var(--c-ink-muted)]"
              >
                <span aria-hidden className="text-[var(--c-accent-text)]">
                  ·
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <SectionHeader title="Other plans" />
      <div className="space-y-[var(--space-lg)]">
        {PLANS.filter((p) => p.tier !== DEMO_SUBSCRIPTION.planTier).map((plan) => (
          <Card key={plan.tier}>
            <div className="flex items-baseline justify-between gap-[var(--space-lg)]">
              <h3 className="font-display text-[18px] leading-[24px]">{plan.name}</h3>
              <p className="tabular text-[15px]">{formatMoney(plan.priceCents)}/mo</p>
            </div>
            <ul className="mt-[var(--space-lg)] space-y-[var(--space-xs)]">
              {plan.benefits.map((b) => (
                <li key={b} className="text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
                  {b}
                </li>
              ))}
            </ul>
            <div className="mt-[var(--space-lg)]">
              <Button variant="secondary">Switch to {plan.name.split(' ')[1]}</Button>
            </div>
          </Card>
        ))}
      </div>

      <SectionHeader title="Manage" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          <ListRow label="Skip next month" onClick={() => {}} />
          <ListRow label="Pause membership" onClick={() => {}} />
          <ListRow label="Cancel membership" danger onClick={() => {}} />
        </div>
      </Card>

      <DemoNote>
        Plans are billed through Square subscriptions. That is third-party work saved for after
        the shell.
      </DemoNote>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export function InvoicesScreen() {
  return (
    <Screen>
      <ScreenHeader eyebrow="Billing" title="Invoices" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          {PAYMENTS.map((payment) => {
            const booking = BOOKINGS.find((b) => b.id === payment.bookingId);
            const services = booking?.serviceIds.map(serviceById).filter(Boolean) ?? [];
            return (
              <ListRow
                key={payment.id}
                label={services.map((s) => s?.name).join(' + ') || 'Service'}
                detail={`${payment.kind === 'deposit' ? 'Deposit' : 'Balance'} · ${
                  payment.paidAt ? dateFormat.format(new Date(payment.paidAt)) : 'Pending'
                } · ${payment.cardBrand} ${payment.cardLast4}`}
                trailing={
                  <span className="tabular text-[14px]">{formatMoney(payment.amountCents)}</span>
                }
              />
            );
          })}
        </div>
      </Card>
      <DemoNote>Receipts come from Square once payments are wired up.</DemoNote>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

export function AboutScreen() {
  return (
    <Screen>
      <ScreenHeader eyebrow="Meet" title="Beezy" />

      <img
        src={assetUrl('brand/photos/owner-portrait.webp')}
        alt="Brandon Schneider"
        className="aspect-[4/5] w-full rounded-[var(--radius-card)] object-cover"
      />

      <div className="mt-[var(--space-2xl)] space-y-[var(--space-lg)] text-[15px] leading-[24px] text-[var(--c-ink-muted)]">
        <p>
          Brandon &ldquo;Beezy&rdquo; Schneider has been detailing cars around New Orleans for
          years. Married, two young sons, and a standard for other people&rsquo;s vehicles that he
          holds to his own.
        </p>
        <p>
          Every car gets the same attention regardless of what it is. That is the whole business
          model, and it is why most of the work comes from people who have already booked once.
        </p>
      </div>

      <SectionHeader title="Why Beezy" />
      <div className="space-y-[var(--space-md)]">
        {[
          ['He comes to you', 'Driveway, office lot, wherever the car sits. You keep your day.'],
          ['Nothing needed from you', 'The van carries its own water and power. No hookup, no hose.'],
          ['One person, every time', 'The same hands on your car, not whoever was scheduled.'],
        ].map(([title, body]) => (
          <Card key={title}>
            <h3 className="text-[15px] leading-[23px]">{title}</h3>
            <p className="mt-[var(--space-xs)] text-[14px] leading-[21px] text-[var(--c-ink-muted)]">
              {body}
            </p>
          </Card>
        ))}
      </div>

      <SectionHeader title="The Beezy-Mobile" />
      <img
        src={assetUrl('brand/photos/beezy-mobile-van.webp')}
        alt="The Beezy-Mobile"
        className="aspect-[4/3] w-full rounded-[var(--radius-card)] object-cover"
      />
      <p className="mt-[var(--space-lg)] text-[15px] leading-[24px] text-[var(--c-ink-muted)]">
        Fully self-contained. Water, power, and every product the job needs travel with it — so a
        detail happens wherever the car happens to be.
      </p>

      <SectionHeader title="Get in touch" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          <ListRow label="Text or call" detail="504-609-0914" />
          <ListRow label="Email" detail="beezyluxurydetailing@gmail.com" />
          <ListRow label="Instagram" detail="@beezy.luxury.detailing" />
        </div>
      </Card>

      <p className="eyebrow mt-[var(--space-2xl)] text-center text-[var(--c-accent-text)]">
        Ridin&rsquo; dirty? Not on my watch
      </p>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Service area · FAQ · Messages · Referral
// ---------------------------------------------------------------------------

const AREAS = [
  'Uptown',
  'Garden District',
  'Mid-City',
  'Lakeview',
  'Bywater',
  'Marigny',
  'Metairie',
  'Kenner',
  'River Ridge',
  'Harahan',
  'Gretna',
  'Algiers',
];

export function ServiceAreaScreen() {
  return (
    <Screen>
      <ScreenHeader eyebrow="Where he goes" title="Service area" />
      <Card>
        <p className="text-[15px] leading-[23px] text-[var(--c-ink-muted)]">
          Greater New Orleans, roughly 20 miles from the city. Further out is still possible —
          there is a travel fee past the line, quoted before you book.
        </p>
      </Card>
      <SectionHeader title="Neighbourhoods" />
      <div className="flex flex-wrap gap-[var(--space-sm)]">
        {AREAS.map((area) => (
          <Chip key={area}>{area}</Chip>
        ))}
      </div>
      <DemoNote>The live radius map needs a maps provider — third-party work, saved for later.</DemoNote>
    </Screen>
  );
}

const FAQS = [
  ['Do you need my water or power?', 'No. The van carries both. Park it near the car and that is all it takes.'],
  ['How long does it take?', 'An Express Wash is about two hours. A full Beezy Wash on a big SUV can be most of a day. The app tells you before you book.'],
  ['What if it rains?', 'Beezy will text you and move it. No charge for weather.'],
  ['Why is the price a range?', 'Size and condition change the work. Your photos set the estimate, and Beezy confirms it before he starts.'],
  ['Do I need to be there?', 'No, as long as he can reach the car. Leave a gate code in the booking.'],
];

export function FaqScreen() {
  return (
    <Screen>
      <ScreenHeader eyebrow="Questions" title="FAQ" />
      <div className="space-y-[var(--space-md)]">
        {FAQS.map(([q, a]) => (
          <Card key={q}>
            <h3 className="text-[15px] leading-[23px]">{q}</h3>
            <p className="mt-[var(--space-sm)] text-[14px] leading-[21px] text-[var(--c-ink-muted)]">
              {a}
            </p>
          </Card>
        ))}
      </div>
    </Screen>
  );
}

export function MessagesScreen() {
  return (
    <Screen>
      <ScreenHeader eyebrow="Talk to" title="Beezy" />
      <EmptyState
        title="No messages yet"
        body="Beezy is SMS-native — most people just text him. In-app messaging arrives with the SMS work."
        action={<Button variant="secondary">Text 504-609-0914</Button>}
      />
    </Screen>
  );
}

export function ReferralScreen() {
  return (
    <Screen>
      <ScreenHeader eyebrow="Share" title="Refer a friend" />
      <Card>
        <p className="text-[15px] leading-[23px] text-[var(--c-ink-muted)]">
          Send someone your code. They get $25 off their first detail, and you get $25 off your
          next one.
        </p>
        <div className="mt-[var(--space-xl)] rounded-[var(--radius-md)] border border-dashed border-[var(--c-hairline)] py-[var(--space-xl)] text-center">
          <p className="tabular font-display text-[28px] leading-[32px] tracking-[0.12em]">
            MARCUS25
          </p>
        </div>
        <div className="mt-[var(--space-lg)]">
          <Button full>Share code</Button>
        </div>
      </Card>
      <DemoNote>Referral tracking arrives with the backend.</DemoNote>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function AppearanceScreen() {
  const { preference, setPreference } = useAppearance();
  const options: ThemePreference[] = ['light', 'dark', 'system'];

  return (
    <Screen>
      <ScreenHeader eyebrow="Settings" title="Appearance" />
      <div
        role="radiogroup"
        aria-label="Appearance"
        className="flex gap-[var(--space-xs)] rounded-[var(--radius-full)] border border-[var(--c-hairline)] p-[var(--space-xs)]"
      >
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={preference === option}
            onClick={() => setPreference(option)}
            className={cx(
              'eyebrow flex-1 rounded-[var(--radius-full)] px-[var(--space-lg)] transition-colors',
              preference === option
                ? 'bg-[var(--c-brand)] text-[var(--c-on-brand)]'
                : 'text-[var(--c-ink-muted)]',
            )}
            style={{ transitionDuration: 'var(--motion-fast)' }}
          >
            {option}
          </button>
        ))}
      </div>
      <p className="mt-[var(--space-lg)] text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">
        System follows your phone&rsquo;s own light and dark setting.
      </p>
    </Screen>
  );
}

export function NotificationsScreen() {
  const rows = [
    ['Appointment reminders', '72 hours, 24 hours, and the morning of'],
    ['On the way', 'When Beezy leaves the previous job'],
    ['Work complete', 'With the before and after photos'],
    ['Membership', 'Renewals and credits expiring'],
  ];
  return (
    <Screen>
      <ScreenHeader eyebrow="Settings" title="Notifications" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          {rows.map(([label, detail]) => (
            <ListRow
              key={label}
              label={label!}
              detail={detail}
              trailing={<Chip tone="success">On</Chip>}
            />
          ))}
        </div>
      </Card>
      <DemoNote>
        Push on iPhone only works once the app is on your Home Screen, and needs the notification
        work. Email and text are the reliable channels for now.
      </DemoNote>
    </Screen>
  );
}

export function ProfileScreen() {
  return (
    <Screen>
      <ScreenHeader eyebrow="Settings" title="Profile" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          <ListRow label="Name" trailing={<span className="text-[14px] text-[var(--c-ink-muted)]">Marcus Boudreaux</span>} />
          <ListRow label="Email" trailing={<span className="text-[14px] text-[var(--c-ink-muted)]">marcus@example.com</span>} />
          <ListRow label="Phone" trailing={<span className="tabular text-[14px] text-[var(--c-ink-muted)]">(504) 555-0142</span>} />
        </div>
      </Card>

      <SectionHeader title="Account" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          <ListRow label="Privacy policy" detail="Opens in your browser" onClick={() => {}} />
          <ListRow label="Sign out" onClick={() => {}} />
          {/* Both stores require in-app deletion, reachable without emailing
              anyone. It is built here rather than deferred. */}
          <ListRow
            label="Delete account"
            detail="Removes your vehicles, photos and details"
            danger
            onClick={() => {}}
          />
        </div>
      </Card>

      <DemoNote>
        Sign-in and account deletion need Supabase auth. Deletion is a store requirement on both
        platforms, so it ships with that work rather than later.
      </DemoNote>
    </Screen>
  );
}
