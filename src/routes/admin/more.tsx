import { useState } from 'react';
import { Button, Card, Chip, DemoNote, ListRow, Screen, ScreenHeader, SectionHeader, Stat } from '../../components/ui';
import { cx } from '../../components/ui/cx';
import { formatDuration, formatMoney } from '../../core/pricing';
import {
  BOOKING_FUNNEL,
  CLIENTS,
  EXPENSES,
  MILEAGE,
  PIPELINE_BOOKINGS,
  PLANS,
  REVENUE_BY_WEEK,
  REVENUE_PER_HOUR,
  SERVICES,
  TEAM,
  clientById,
  serviceById,
} from '../../core/fixtures';

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7am–6pm

export function Schedule() {
  const [offset, setOffset] = useState(0);
  const day = new Date();
  day.setDate(day.getDate() + offset);

  const dayBookings = PIPELINE_BOOKINGS.filter((b) => {
    const d = new Date(b.scheduledAt);
    return d.toDateString() === day.toDateString();
  });

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Calendar"
        title="Schedule"
        action={
          <div className="flex gap-[var(--space-xs)]">
            <button
              type="button"
              onClick={() => setOffset((o) => o - 1)}
              aria-label="Previous day"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--c-hairline)]"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setOffset((o) => o + 1)}
              aria-label="Next day"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--c-hairline)]"
            >
              ›
            </button>
          </div>
        }
      />

      <p className="eyebrow mb-[var(--space-lg)] text-[var(--c-accent-text)]">
        {new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        }).format(day)}
      </p>

      {/* A real timeline rather than a list: gaps are the useful information,
          because they are where another job could fit. */}
      <Card padded={false}>
        <div className="relative px-[var(--space-lg)] py-[var(--space-lg)]">
          {HOURS.map((hour) => {
            const booking = dayBookings.find((b) => new Date(b.scheduledAt).getHours() === hour);
            const client = booking ? clientById(booking.clientId) : undefined;
            return (
              <div key={hour} className="flex gap-[var(--space-lg)]">
                <span className="tabular w-12 shrink-0 pt-[var(--space-sm)] text-[12px] leading-[17px] text-[var(--c-ink-subtle)]">
                  {hour > 12 ? `${hour - 12} pm` : hour === 12 ? '12 pm' : `${hour} am`}
                </span>
                <div className="min-w-0 flex-1 border-t border-[var(--c-hairline)] py-[var(--space-sm)]">
                  {booking ? (
                    <div className="rounded-[var(--radius-md)] bg-[var(--c-surface-alt)] px-[var(--space-lg)] py-[var(--space-md)]">
                      <p className="text-[14px] leading-[21px]">{client?.fullName}</p>
                      <p className="text-[12px] leading-[17px] text-[var(--c-ink-subtle)]">
                        {booking.serviceIds.map((id) => serviceById(id)?.name).join(' + ')} ·{' '}
                        {formatDuration(booking.durationMinutes)}
                      </p>
                    </div>
                  ) : (
                    <div className="h-6" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <SectionHeader title="Rules" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          <ListRow label="Working hours" trailing={<span className="tabular text-[14px] text-[var(--c-ink-muted)]">8:00 – 18:00</span>} />
          <ListRow label="Jobs per day" trailing={<span className="tabular text-[14px] text-[var(--c-ink-muted)]">3</span>} />
          <ListRow label="Buffer between jobs" trailing={<span className="tabular text-[14px] text-[var(--c-ink-muted)]">45 min</span>} />
          <ListRow label="Blackout dates" trailing={<span className="text-[14px] text-[var(--c-ink-muted)]">2 set</span>} />
        </div>
      </Card>

      <DemoNote>
        Drag-to-reschedule and two-way Google Calendar sync are third-party work, saved for after
        the shell.
      </DemoNote>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

export function Reporting() {
  const total = REVENUE_BY_WEEK.reduce((s, w) => s + w.cents, 0);
  const thisWeek = REVENUE_BY_WEEK.at(-1)?.cents ?? 0;
  const lastWeek = REVENUE_BY_WEEK.at(-2)?.cents ?? 0;
  const change = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;
  const maxWeek = Math.max(...REVENUE_BY_WEEK.map((w) => w.cents));
  const maxPerHour = Math.max(...REVENUE_PER_HOUR.map((r) => r.centsPerHour));
  const maxFunnel = BOOKING_FUNNEL[0]?.count ?? 1;

  return (
    <Screen>
      <ScreenHeader eyebrow="Last 8 weeks" title="Reporting" />

      <Card>
        <div className="flex items-start justify-between gap-[var(--space-lg)]">
          <Stat value={formatMoney(total)} label="total revenue" />
          <Stat value={formatMoney(thisWeek)} label="this week" tone="accent" />
          <Stat value={`${change > 0 ? '+' : ''}${change}%`} label="vs last week" />
        </div>
      </Card>

      <SectionHeader title="Revenue by week" />
      <Card>
        <div className="flex h-36 gap-[var(--space-sm)]" role="img" aria-label="Revenue by week">
          {REVENUE_BY_WEEK.map((week) => (
            <div key={week.label} className="flex h-full flex-1 flex-col items-center">
              {/* The bar's percentage height needs a resolved height to
                  measure against, so the column is h-full and the track below
                  takes the remaining space. An auto-height parent silently
                  collapses every bar to nothing. */}
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-[4px] bg-[var(--c-accent)]"
                  style={{ height: `${(week.cents / maxWeek) * 100}%`, opacity: 0.85 }}
                />
              </div>
              <span className="mt-[var(--space-sm)] text-[9px] leading-[12px] text-[var(--c-ink-subtle)]">
                {week.label.split(' ')[1]}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* The metric that changes behaviour. A $399 clay bar that eats six
          hours earns less per hour than three Express Washes. */}
      <SectionHeader title="Revenue per hour" />
      <Card>
        <p className="mb-[var(--space-lg)] text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
          What each service actually earns for the time it takes.
        </p>
        <div className="space-y-[var(--space-md)]">
          {[...REVENUE_PER_HOUR]
            .sort((a, b) => b.centsPerHour - a.centsPerHour)
            .map((row) => (
              <div key={row.serviceSlug}>
                <div className="mb-[2px] flex items-baseline justify-between">
                  <span className="text-[13px] leading-[19px]">{row.label}</span>
                  <span className="tabular text-[13px] leading-[19px]">
                    {formatMoney(row.centsPerHour)}/hr
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--c-hairline)]">
                  <div
                    className="h-full rounded-full bg-[var(--c-accent)]"
                    style={{ width: `${(row.centsPerHour / maxPerHour) * 100}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      </Card>

      <SectionHeader title="Booking funnel" />
      <Card>
        <div className="space-y-[var(--space-md)]">
          {BOOKING_FUNNEL.map((step, i) => {
            const previous = BOOKING_FUNNEL[i - 1]?.count;
            const drop = previous ? Math.round(((previous - step.count) / previous) * 100) : 0;
            return (
              <div key={step.step}>
                <div className="mb-[2px] flex items-baseline justify-between">
                  <span className="text-[13px] leading-[19px]">{step.step}</span>
                  <span className="tabular text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
                    {step.count}
                    {drop > 0 && (
                      <span className={cx('ml-[var(--space-sm)]', drop >= 40 && 'text-[var(--c-warning-text)]')}>
                        −{drop}%
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--c-hairline)]">
                  <div
                    className="h-full rounded-full bg-[var(--c-brand)]"
                    style={{ width: `${(step.count / maxFunnel) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <SectionHeader title="Clients" />
      <Card>
        <div className="flex items-start justify-between gap-[var(--space-lg)]">
          <Stat value={`${CLIENTS.length}`} label="total" />
          <Stat value={`${CLIENTS.filter((c) => c.tags.includes('recurring')).length}`} label="recurring" />
          <Stat value={`${CLIENTS.filter((c) => c.tags.includes('lapsed')).length}`} label="lapsed" />
        </div>
      </Card>

      <DemoNote>Demo figures. Real reporting reads from the backend.</DemoNote>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Subscribers
// ---------------------------------------------------------------------------

export function Subscribers() {
  const mrr = 12 * 26000 + 5 * 12000 + 2 * 58000;
  return (
    <Screen>
      <ScreenHeader eyebrow="Recurring" title="Subscribers" />
      <Card>
        <div className="flex items-start justify-between gap-[var(--space-lg)]">
          <Stat value={formatMoney(mrr)} label="MRR" tone="accent" />
          <Stat value="19" label="members" />
          <Stat value="3.1%" label="churn" />
        </div>
      </Card>
      <SectionHeader title="By plan" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          {PLANS.map((plan, i) => (
            <ListRow
              key={plan.tier}
              label={plan.name}
              detail={`${[5, 12, 2][i]} members · ${formatMoney(plan.priceCents)}/mo`}
              trailing={
                <span className="tabular text-[14px]">
                  {formatMoney(plan.priceCents * [5, 12, 2][i]!)}
                </span>
              }
            />
          ))}
        </div>
      </Card>
      <DemoNote>Square subscriptions are third-party work, saved for later.</DemoNote>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Service menu editor
// ---------------------------------------------------------------------------

export function ServiceMenuEditor() {
  return (
    <Screen>
      <ScreenHeader eyebrow="Settings" title="Service menu" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          {SERVICES.map((service) => (
            <ListRow
              key={service.id}
              label={service.name}
              detail={`${formatDuration(service.baseDurationMinutes)} · ${service.isAddon ? 'Add-on' : 'Base service'}`}
              onClick={() => {}}
              trailing={
                <span className="tabular text-[14px]">{formatMoney(service.basePriceCents)}+</span>
              }
            />
          ))}
        </div>
      </Card>
      <div className="mt-[var(--space-lg)]">
        <Button variant="secondary" full>
          Add a service
        </Button>
      </div>
      <DemoNote>
        Editing writes to the database, and later mirrors into the Square catalog so the existing
        booking page cannot drift out of sync.
      </DemoNote>
    </Screen>
  );
}

export function PlansEditor() {
  return (
    <Screen>
      <ScreenHeader eyebrow="Settings" title="Membership plans" />
      <div className="space-y-[var(--space-lg)]">
        {PLANS.map((plan) => (
          <Card key={plan.tier}>
            <div className="flex items-baseline justify-between gap-[var(--space-lg)]">
              <h3 className="font-display text-[18px] leading-[24px]">{plan.name}</h3>
              <span className="tabular text-[15px]">{formatMoney(plan.priceCents)}/mo</span>
            </div>
            <ul className="mt-[var(--space-lg)] space-y-[var(--space-xs)]">
              {plan.benefits.map((b) => (
                <li key={b} className="text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
                  {b}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <DemoNote>
        Plan copy describes physical services only — wording that implies a subscription unlocks
        app features invites a rejection on both stores.
      </DemoNote>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Team · expenses · mileage · checklists · settings · integrations
// ---------------------------------------------------------------------------

export function Team() {
  return (
    <Screen>
      <ScreenHeader eyebrow="People" title="Team" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          {TEAM.map((member) => (
            <ListRow
              key={member.id}
              label={member.name}
              detail={`${member.role} · ${member.jobsThisWeek} jobs this week`}
              trailing={<Chip tone={member.role === 'owner' ? 'accent' : 'neutral'}>{member.role}</Chip>}
            />
          ))}
        </div>
      </Card>
      <div className="mt-[var(--space-lg)]">
        <Button variant="secondary" full>
          Invite a tech
        </Button>
      </div>
      <DemoNote>
        Built for one person today, but the roles exist from the start: a tech sees assigned jobs
        and no revenue anywhere.
      </DemoNote>
    </Screen>
  );
}

export function Expenses() {
  const total = EXPENSES.reduce((s, e) => s + e.cents, 0);
  return (
    <Screen>
      <ScreenHeader eyebrow="This month" title="Expenses" />
      <Card>
        <Stat value={formatMoney(total)} label="total" />
      </Card>
      <SectionHeader title="Recent" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          {EXPENSES.map((expense) => (
            <ListRow
              key={expense.id}
              label={expense.label}
              detail={`${expense.category} · ${dateFormat.format(new Date(expense.at))}`}
              trailing={<span className="tabular text-[14px]">{formatMoney(expense.cents)}</span>}
            />
          ))}
        </div>
      </Card>
      <div className="mt-[var(--space-lg)]">
        <Button variant="secondary" full>
          Log an expense
        </Button>
      </div>
    </Screen>
  );
}

export function Mileage() {
  const total = MILEAGE.reduce((s, m) => s + m.miles, 0);
  // The 2026 IRS business rate; the deduction is the number that matters.
  const RATE_CENTS_PER_MILE = 70;
  return (
    <Screen>
      <ScreenHeader eyebrow="This week" title="Mileage" />
      <Card>
        <div className="flex items-start justify-between gap-[var(--space-lg)]">
          <Stat value={`${total}`} label="miles" />
          <Stat value={formatMoney(total * RATE_CENTS_PER_MILE)} label="deduction" tone="accent" />
        </div>
      </Card>
      <SectionHeader title="Trips" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          {MILEAGE.map((trip) => (
            <ListRow
              key={trip.id}
              label={trip.purpose}
              detail={dateFormat.format(new Date(trip.date))}
              trailing={<span className="tabular text-[14px]">{trip.miles} mi</span>}
            />
          ))}
        </div>
      </Card>
      <DemoNote>
        Automatic trip capture needs background location, which a web app cannot do. It arrives
        with the native build.
      </DemoNote>
    </Screen>
  );
}

export function Checklists() {
  return (
    <Screen>
      <ScreenHeader eyebrow="Quality" title="Checklists" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          {SERVICES.filter((s) => !s.isAddon).map((service) => (
            <ListRow key={service.id} label={service.name} detail="8 steps · 2 photo gates" onClick={() => {}} />
          ))}
        </div>
      </Card>
      <DemoNote>
        Photo gates are what protect Beezy on a pre-existing damage dispute — the reason every
        serious platform builds them.
      </DemoNote>
    </Screen>
  );
}

export function BusinessSettings() {
  return (
    <Screen>
      <ScreenHeader eyebrow="Admin" title="Business settings" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          <ListRow label="Business name" trailing={<span className="text-[14px] text-[var(--c-ink-muted)]">Beezy Luxury Detailing</span>} />
          <ListRow label="Phone" trailing={<span className="tabular text-[14px] text-[var(--c-ink-muted)]">504-609-0914</span>} />
          <ListRow label="Service radius" trailing={<span className="tabular text-[14px] text-[var(--c-ink-muted)]">20 mi</span>} />
          <ListRow label="Deposit" trailing={<span className="tabular text-[14px] text-[var(--c-ink-muted)]">20%</span>} />
          <ListRow label="Travel fee" trailing={<span className="tabular text-[14px] text-[var(--c-ink-muted)]">$1.75/mi</span>} />
        </div>
      </Card>
    </Screen>
  );
}

const INTEGRATIONS = [
  ['Square', 'Payments, bookings and subscriptions', false],
  ['Google Calendar', "Mirror of Beezy's working calendar", false],
  ['Email', 'Confirmations, reminders and receipts', false],
  ['SMS', 'Reminders and two-way messaging', false],
] as const;

export function Integrations() {
  return (
    <Screen>
      <ScreenHeader eyebrow="Admin" title="Integrations" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          {INTEGRATIONS.map(([name, detail, connected]) => (
            <ListRow
              key={name}
              label={name}
              detail={detail}
              trailing={<Chip tone={connected ? 'success' : 'neutral'}>{connected ? 'Connected' : 'Not set up'}</Chip>}
            />
          ))}
        </div>
      </Card>
      <DemoNote>
        All four are third-party connections, deliberately left until the shell is settled.
      </DemoNote>
    </Screen>
  );
}
