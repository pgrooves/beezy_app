import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Chip, DemoNote } from '../../../components/ui';
import { cx } from '../../../components/ui/cx';
import { assetUrl } from '../../../lib/assets';
import { useBooking } from '../../../app/booking';
import {
  CONDITION_COPY,
  SIZE_LABEL,
  SURCHARGES,
  formatDelta,
  formatDuration,
  formatMoney,
  sizeClassFor,
} from '../../../core/pricing';
import { SERVICES, VEHICLES } from '../../../core/fixtures';
import type { ConditionTier, SurchargeCode } from '../../../core/types';

const StepTitle = ({ title, body }: { title: string; body?: string }) => (
  <div className="mb-[var(--space-xl)]">
    <h1 className="font-display text-[28px] leading-[34px]">{title}</h1>
    {body && (
      <p className="mt-[var(--space-sm)] text-[15px] leading-[23px] text-[var(--c-ink-muted)]">
        {body}
      </p>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// 1. Service
// ---------------------------------------------------------------------------

export function StepService() {
  const selected = useBooking((s) => s.serviceIds);
  const toggle = useBooking((s) => s.toggleService);
  const base = SERVICES.filter((s) => !s.isAddon);
  const addons = SERVICES.filter((s) => s.isAddon);
  const hasBase = selected.some((id) => base.some((b) => b.id === id));

  return (
    <>
      <StepTitle title="What does it need?" body="Pick one. You can add extras below." />

      <div className="space-y-[var(--space-lg)]">
        {base.map((service) => {
          const active = selected.includes(service.id);
          return (
            <Card
              key={service.id}
              padded={false}
              onClick={() => toggle(service.id)}
              className={cx(active && 'ring-2 ring-[var(--c-accent)]')}
            >
              {service.imageUrl && (
                <img
                  src={assetUrl(service.imageUrl)}
                  alt=""
                  className="aspect-[16/9] w-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="p-[var(--space-xl)]">
                <div className="flex items-start justify-between gap-[var(--space-lg)]">
                  <div className="min-w-0">
                    <h2 className="font-display text-[20px] leading-[26px]">{service.name}</h2>
                    <p className="mt-[var(--space-xs)] text-[14px] leading-[21px] text-[var(--c-ink-muted)]">
                      {service.summary}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="money text-[20px] leading-[26px]">
                      {formatMoney(service.basePriceCents)}+
                    </p>
                    <p className="text-[12px] leading-[16px] text-[var(--c-ink-subtle)]">
                      {formatDuration(service.baseDurationMinutes)}
                    </p>
                  </div>
                </div>
                {active && (
                  <ul className="mt-[var(--space-lg)] space-y-[var(--space-xs)] border-t border-[var(--c-hairline)] pt-[var(--space-lg)]">
                    {service.includes.map((line) => (
                      <li
                        key={line}
                        className="flex gap-[var(--space-sm)] text-[13px] leading-[19px] text-[var(--c-ink-muted)]"
                      >
                        <span aria-hidden className="text-[var(--c-accent-text)]">
                          ·
                        </span>
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {hasBase && (
        <>
          <h2 className="eyebrow mb-[var(--space-lg)] mt-[var(--space-2xl)] text-[var(--c-ink-subtle)]">
            Add to it
          </h2>
          <div className="space-y-[var(--space-md)]">
            {addons.map((service) => {
              const active = selected.includes(service.id);
              return (
                <Card
                  key={service.id}
                  onClick={() => toggle(service.id)}
                  className={cx(active && 'ring-2 ring-[var(--c-accent)]')}
                >
                  <div className="flex items-center justify-between gap-[var(--space-lg)]">
                    <div className="min-w-0">
                      <div className="flex items-center gap-[var(--space-sm)]">
                        <h3 className="text-[15px] leading-[23px]">{service.name}</h3>
                        {service.isPremium && <Chip tone="accent">Premium</Chip>}
                      </div>
                      <p className="mt-[2px] text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
                        {service.summary}
                      </p>
                    </div>
                    <p className="tabular shrink-0 text-[15px] leading-[23px] text-[var(--c-accent-text)]">
                      {formatDelta(service.basePriceCents)}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 2. Vehicle
// ---------------------------------------------------------------------------

export function StepVehicle() {
  const vehicleId = useBooking((s) => s.vehicleId);
  const setVehicle = useBooking((s) => s.setVehicle);

  return (
    <>
      <StepTitle
        title="Which car?"
        body="Size affects the price, so we read it off the vehicle rather than asking you."
      />

      <div className="space-y-[var(--space-lg)]">
        {VEHICLES.map((vehicle) => {
          const active = vehicleId === vehicle.id;
          const size = sizeClassFor(vehicle);
          return (
            <Card
              key={vehicle.id}
              onClick={() => setVehicle(vehicle.id)}
              padded={false}
              className={cx(active && 'ring-2 ring-[var(--c-accent)]')}
            >
              <div className="flex items-center gap-[var(--space-lg)] p-[var(--space-lg)]">
                {vehicle.photoUrl && (
                  <img
                    src={assetUrl(vehicle.photoUrl)}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-[var(--radius-md)] object-cover"
                    loading="lazy"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] leading-[23px]">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h2>
                  <p className="mt-[2px] text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
                    {vehicle.colour}
                  </p>
                  {/* Stated as a fact with an escape hatch, never as a question. */}
                  <p className="mt-[var(--space-sm)] text-[12px] leading-[16px] text-[var(--c-ink-subtle)]">
                    {SIZE_LABEL[size]}
                    {vehicle.thirdRow && ' · third row'}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <button
        type="button"
        className="eyebrow mt-[var(--space-lg)] w-full rounded-[var(--radius-full)] border border-dashed border-[var(--c-hairline)] py-[var(--space-lg)] text-[var(--c-ink-muted)]"
      >
        + Add another vehicle
      </button>

      <DemoNote>
        Adding a vehicle and decoding a VIN arrive with the backend. The size band above is
        computed live by the real pricing engine.
      </DemoNote>
    </>
  );
}

// ---------------------------------------------------------------------------
// 3. Condition
// ---------------------------------------------------------------------------

const TIERS: ConditionTier[] = ['light', 'moderate', 'heavy', 'extreme'];
const OPTIONAL_SURCHARGES: SurchargeCode[] = ['pet_hair', 'gulf_sand'];

export function StepCondition() {
  const photos = useBooking((s) => s.photos);
  const capture = useBooking((s) => s.capturePhoto);
  const condition = useBooking((s) => s.condition);
  const setCondition = useBooking((s) => s.setCondition);
  const surcharges = useBooking((s) => s.surcharges);
  const toggleSurcharge = useBooking((s) => s.toggleSurcharge);
  const captured = photos.filter((p) => p.captured).length;

  return (
    <>
      {/* Photo-first, not question-first: "show me the car" is what the
          customer wanted to do anyway. The tier is only the pricing proxy. */}
      <StepTitle
        title="Show me the car"
        body="Two photos minimum, four is better. This is what makes the quote accurate before Beezy arrives."
      />

      <div className="grid grid-cols-2 gap-[var(--space-md)]">
        {photos.map((photo) => (
          <button
            key={photo.slot}
            type="button"
            onClick={() => capture(photo.slot)}
            aria-pressed={photo.captured}
            className={cx(
              'flex aspect-[4/3] flex-col items-center justify-center gap-[var(--space-sm)] rounded-[var(--radius-card)] border text-center transition-colors',
              photo.captured
                ? 'border-[var(--c-accent)] bg-[var(--c-surface-alt)]'
                : 'border-dashed border-[var(--c-hairline)]',
            )}
            style={{ transitionDuration: 'var(--motion-fast)' }}
          >
            <span aria-hidden className="text-[var(--c-ink-subtle)]">
              {photo.captured ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="m5 12.5 4.5 4.5L19 7.5"
                    stroke="var(--c-accent-text)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="7" width="18" height="13" rx="2.5" strokeWidth="1.5" />
                  <circle cx="12" cy="13.5" r="3.5" strokeWidth="1.5" />
                  <path d="M8.5 7 10 4.5h4L15.5 7" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="eyebrow text-[9px] text-[var(--c-ink-muted)]">{photo.label}</span>
          </button>
        ))}
      </div>
      <p className="mt-[var(--space-md)] text-center text-[12px] leading-[17px] text-[var(--c-ink-subtle)]">
        {captured} of 4 added
      </p>

      <h2 className="eyebrow mb-[var(--space-lg)] mt-[var(--space-2xl)] text-[var(--c-ink-subtle)]">
        How is it looking?
      </h2>
      <div className="space-y-[var(--space-md)]">
        {TIERS.map((tier) => {
          const active = condition === tier;
          return (
            <Card
              key={tier}
              onClick={() => setCondition(tier)}
              className={cx(active && 'ring-2 ring-[var(--c-accent)]')}
            >
              <div className="flex items-baseline justify-between gap-[var(--space-lg)]">
                <div className="min-w-0">
                  <h3 className="text-[15px] leading-[23px]">{CONDITION_COPY[tier].label}</h3>
                  <p className="mt-[2px] text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
                    {CONDITION_COPY[tier].detail}
                  </p>
                </div>
                {tier === 'extreme' && <Chip tone="warning">Quoted on site</Chip>}
              </div>
            </Card>
          );
        })}
      </div>

      <h2 className="eyebrow mb-[var(--space-lg)] mt-[var(--space-2xl)] text-[var(--c-ink-subtle)]">
        Anything else in there?
      </h2>
      <div className="space-y-[var(--space-md)]">
        {OPTIONAL_SURCHARGES.map((code) => {
          const active = surcharges.includes(code);
          const surcharge = SURCHARGES[code];
          return (
            <Card
              key={code}
              onClick={() => toggleSurcharge(code)}
              className={cx(active && 'ring-2 ring-[var(--c-accent)]')}
            >
              <div className="flex items-center justify-between gap-[var(--space-lg)]">
                <div className="min-w-0">
                  <h3 className="text-[15px] leading-[23px]">{surcharge.label}</h3>
                  <p className="mt-[2px] text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
                    {surcharge.detail}
                  </p>
                </div>
                <p className="tabular shrink-0 text-[15px] text-[var(--c-accent-text)]">
                  {formatDelta(surcharge.cents)}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      <DemoNote>
        Tapping a tile marks the photo as added. Real capture needs the camera adapter, which
        lands with the backend work.
      </DemoNote>
    </>
  );
}

// ---------------------------------------------------------------------------
// 4. Location
// ---------------------------------------------------------------------------

export function StepLocation() {
  const address = useBooking((s) => s.address);
  const setAddress = useBooking((s) => s.setAddress);
  const [form, setForm] = useState({
    line1: address?.line1 ?? '',
    city: address?.city ?? 'New Orleans',
    postalCode: address?.postalCode ?? '',
    gateCode: address?.gateCode ?? '',
    parkingNotes: address?.parkingNotes ?? '',
    covered: address?.covered ?? false,
  });

  const update = (patch: Partial<typeof form>) => {
    const next = { ...form, ...patch };
    setForm(next);
    setAddress({ ...next, state: 'LA' });
  };

  return (
    <>
      <StepTitle title="Where's the car?" body="Beezy comes to you. The van is self-contained — no water or power needed." />

      <div className="space-y-[var(--space-lg)]">
        <Field label="Street address">
          <input
            value={form.line1}
            onChange={(e) => update({ line1: e.target.value })}
            placeholder="1428 Napoleon Ave"
            autoComplete="address-line1"
            className={inputClass}
          />
        </Field>
        <div className="flex gap-[var(--space-lg)]">
          <Field label="City" className="flex-1">
            <input
              value={form.city}
              onChange={(e) => update({ city: e.target.value })}
              autoComplete="address-level2"
              className={inputClass}
            />
          </Field>
          <Field label="ZIP" className="w-[38%]">
            <input
              value={form.postalCode}
              onChange={(e) => update({ postalCode: e.target.value })}
              inputMode="numeric"
              placeholder="70115"
              autoComplete="postal-code"
              className={cx(inputClass, 'tabular')}
            />
          </Field>
        </div>
        <Field label="Gate or door code" hint="Optional">
          <input
            value={form.gateCode}
            onChange={(e) => update({ gateCode: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Where should he park?" hint="Optional">
          <textarea
            value={form.parkingNotes}
            onChange={(e) => update({ parkingNotes: e.target.value })}
            rows={2}
            placeholder="Driveway on the right, behind the gate."
            className={cx(inputClass, 'resize-none')}
          />
        </Field>

        <Card onClick={() => update({ covered: !form.covered })}>
          <div className="flex items-center justify-between gap-[var(--space-lg)]">
            <div className="min-w-0">
              <h3 className="text-[15px] leading-[23px]">Covered or shaded parking</h3>
              <p className="mt-[2px] text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
                Some services can&rsquo;t be done in full sun in July.
              </p>
            </div>
            <Toggle on={form.covered} />
          </div>
        </Card>
      </div>

      <div className="mt-[var(--space-xl)] rounded-[var(--radius-card)] border border-[var(--c-hairline)] bg-[var(--c-surface-alt)] p-[var(--space-lg)]">
        <p className="eyebrow text-[var(--c-success-text)]">Inside the service area</p>
        <p className="mt-[var(--space-xs)] text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
          Greater New Orleans. About 12 miles from base — no travel fee.
        </p>
      </div>

      <DemoNote>
        Address autocomplete and the live service-area check need a maps provider, which is
        third-party work saved for later.
      </DemoNote>
    </>
  );
}

const inputClass =
  'w-full rounded-[var(--radius-md)] border border-[var(--c-hairline)] bg-[var(--c-surface)] px-[var(--space-lg)] py-[var(--space-md)] text-[15px] leading-[23px] text-[var(--c-ink)] outline-none focus:border-[var(--c-accent-text)]';

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cx('block', className)}>
      <span className="eyebrow mb-[var(--space-sm)] flex items-baseline justify-between text-[var(--c-ink-subtle)]">
        {label}
        {hint && <span className="text-[9px]">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        'relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors',
        on ? 'bg-[var(--c-accent)]' : 'bg-[var(--c-hairline)]',
      )}
      style={{ transitionDuration: 'var(--motion-fast)' }}
    >
      <span
        className="absolute top-[3px] h-6 w-6 rounded-full bg-[var(--c-surface)] shadow-[var(--shadow-card)] transition-[left]"
        style={{ left: on ? 23 : 3, transitionDuration: 'var(--motion-fast)' }}
      />
    </span>
  );
}

// ---------------------------------------------------------------------------
// 5. Time
// ---------------------------------------------------------------------------

const dayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric' });

/**
 * Only genuinely bookable slots. The real engine will fold in working hours,
 * per-day caps, buffers and travel time from the previous job's address; the
 * shape here is what it returns.
 */
function slotsFor(dayOffset: number, durationMinutes: number) {
  const base = new Date();
  base.setDate(base.getDate() + dayOffset);
  const longJob = durationMinutes > 240;
  const hours = longJob ? [8] : [8, 12, 15];
  return hours.map((h) => {
    const d = new Date(base);
    d.setHours(h, 0, 0, 0);
    return d;
  });
}

export function StepTime() {
  const scheduledAt = useBooking((s) => s.scheduledAt);
  const setScheduledAt = useBooking((s) => s.setScheduledAt);
  // Whole-store subscription: `quote` is a stable reference, so selecting it
  // alone would not re-render when the draft changes.
  const quote = useBooking().quote();
  const [dayOffset, setDayOffset] = useState(2);
  const duration = quote?.estimatedMinutes ?? 180;
  const slots = slotsFor(dayOffset, duration);

  return (
    <>
      <StepTitle
        title="When works?"
        body={`This job needs about ${formatDuration(duration)}, so only slots that fit are shown.`}
      />

      <div className="-mx-[var(--space-gutter)] mb-[var(--space-xl)] flex gap-[var(--space-sm)] overflow-x-auto px-[var(--space-gutter)] pb-[var(--space-sm)]">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((offset) => {
          const d = new Date();
          d.setDate(d.getDate() + offset);
          const active = offset === dayOffset;
          return (
            <button
              key={offset}
              type="button"
              onClick={() => setDayOffset(offset)}
              className={cx(
                'shrink-0 rounded-[var(--radius-md)] border px-[var(--space-lg)] py-[var(--space-md)] text-center transition-colors',
                active
                  ? 'border-[var(--c-brand)] bg-[var(--c-brand)] text-[var(--c-on-brand)]'
                  : 'border-[var(--c-hairline)] text-[var(--c-ink-muted)]',
              )}
              style={{ transitionDuration: 'var(--motion-fast)' }}
            >
              <span className="tabular block text-[13px] leading-[19px]">
                {dayLabel.format(d)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-[var(--space-md)]">
        {slots.map((slot) => {
          const iso = slot.toISOString();
          const active = scheduledAt === iso;
          const end = new Date(slot.getTime() + duration * 60_000);
          return (
            <Card
              key={iso}
              onClick={() => setScheduledAt(iso)}
              className={cx(active && 'ring-2 ring-[var(--c-accent)]')}
            >
              <div className="flex items-center justify-between gap-[var(--space-lg)]">
                <p className="tabular text-[17px] leading-[26px]">
                  {slot.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
                <p className="tabular text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">
                  until {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            </Card>
          );
        })}
        {slots.length === 0 && (
          <p className="text-[14px] leading-[21px] text-[var(--c-ink-muted)]">
            Nothing that day will fit a job this long. Try another.
          </p>
        )}
      </div>

      <DemoNote>
        Slot lengths already come from the live pricing engine. Real availability needs the
        calendar sync, which is third-party work.
      </DemoNote>
    </>
  );
}

// ---------------------------------------------------------------------------
// 6. Deposit
// ---------------------------------------------------------------------------

export function StepDeposit() {
  const quote = useBooking().quote();
  const cardOnFile = useBooking((s) => s.cardOnFile);
  const setCardOnFile = useBooking((s) => s.setCardOnFile);

  return (
    <>
      <StepTitle
        title="Hold the slot"
        body="A deposit keeps the time yours. It comes off the final bill."
      />

      {quote && (
        <Card>
          <ul className="space-y-[var(--space-md)]">
            {quote.lines.map((line, i) => (
              <li key={i} className="flex items-baseline justify-between gap-[var(--space-lg)]">
                <span className="min-w-0">
                  <span className="block text-[14px] leading-[21px]">{line.label}</span>
                  {line.detail && (
                    <span className="block text-[12px] leading-[16px] text-[var(--c-ink-subtle)]">
                      {line.detail}
                    </span>
                  )}
                </span>
                <span className="tabular shrink-0 text-[14px] leading-[21px]">
                  {i === 0 ? formatMoney(line.amountCents) : formatDelta(line.amountCents)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-[var(--space-lg)] flex items-baseline justify-between border-t border-[var(--c-hairline)] pt-[var(--space-lg)]">
            <span className="eyebrow text-[var(--c-ink-subtle)]">Estimated total</span>
            <span className="money text-[24px] leading-[30px]">
              {formatMoney(quote.subtotalCents)}
            </span>
          </div>
          <div className="mt-[var(--space-md)] flex items-baseline justify-between">
            <span className="eyebrow text-[var(--c-accent-text)]">Due today</span>
            <span className="money text-[20px] leading-[26px] text-[var(--c-accent-text)]">
              {formatMoney(quote.depositCents)}
            </span>
          </div>
        </Card>
      )}

      <Card
        onClick={() => setCardOnFile(!cardOnFile)}
        className={cx('mt-[var(--space-lg)]', cardOnFile && 'ring-2 ring-[var(--c-accent)]')}
      >
        <div className="flex items-center justify-between gap-[var(--space-lg)]">
          <div className="min-w-0">
            <h3 className="text-[15px] leading-[23px]">
              {cardOnFile ? 'Visa ending 4242' : 'Add a card'}
            </h3>
            <p className="mt-[2px] text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
              {cardOnFile
                ? 'Charged when you confirm. Balance due after the work.'
                : 'Card details go straight to Square — we never see the number.'}
            </p>
          </div>
          <Toggle on={cardOnFile} />
        </div>
      </Card>

      <DemoNote>
        Tapping the card stands in for Square&rsquo;s payment sheet. No card is stored and nothing
        is charged — Square is third-party work saved for after the shell.
      </DemoNote>
    </>
  );
}

// ---------------------------------------------------------------------------
// 7. Confirm
// ---------------------------------------------------------------------------

const fullDate = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function StepConfirm() {
  const draft = useBooking();
  const quote = draft.quote();
  const vehicle = VEHICLES.find((v) => v.id === draft.vehicleId);
  const services = draft.serviceIds
    .map((id) => SERVICES.find((s) => s.id === id))
    .filter(Boolean);

  return (
    <>
      <div className="mb-[var(--space-2xl)] text-center">
        <div
          aria-hidden
          className="mx-auto mb-[var(--space-lg)] flex h-14 w-14 items-center justify-center rounded-full bg-[var(--c-accent)]"
          style={{ opacity: 0.16 }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="m5 12.5 4.5 4.5L19 7.5"
              stroke="var(--c-accent-text)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="font-display text-[28px] leading-[34px]">You&rsquo;re booked</h1>
        <p className="mx-auto mt-[var(--space-sm)] max-w-[30ch] text-[15px] leading-[23px] text-[var(--c-ink-muted)]">
          Beezy will text you the morning of. Reminders at 72 and 24 hours.
        </p>
      </div>

      <Card>
        <dl className="space-y-[var(--space-lg)]">
          <Row term="When" value={draft.scheduledAt ? fullDate.format(new Date(draft.scheduledAt)) : '—'} />
          <Row term="Service" value={services.map((s) => s?.name).join(' + ') || '—'} />
          <Row
            term="Vehicle"
            value={vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : '—'}
          />
          <Row
            term="Where"
            value={draft.address ? `${draft.address.line1}, ${draft.address.city}` : '—'}
          />
          {quote && (
            <>
              <Row term="Estimate" value={formatMoney(quote.subtotalCents)} />
              <Row term="Paid today" value={formatMoney(quote.depositCents)} />
            </>
          )}
        </dl>
      </Card>

      <div className="mt-[var(--space-lg)] space-y-[var(--space-md)]">
        <button
          type="button"
          className="eyebrow w-full rounded-[var(--radius-full)] border border-[var(--c-hairline)] py-[var(--space-lg)] text-[var(--c-ink)]"
        >
          Add to calendar
        </button>
        <Link
          to="/"
          className="eyebrow block w-full rounded-[var(--radius-full)] py-[var(--space-lg)] text-center text-[var(--c-ink-muted)]"
        >
          Back to home
        </Link>
      </div>

      <DemoNote>
        Nothing was saved or charged — this is the shell. Confirmation email, calendar sync and
        the deposit arrive with the integrations.
      </DemoNote>
    </>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-[var(--space-lg)]">
      <dt className="eyebrow shrink-0 text-[var(--c-ink-subtle)]">{term}</dt>
      <dd className="tabular min-w-0 text-right text-[14px] leading-[21px]">{value}</dd>
    </div>
  );
}
