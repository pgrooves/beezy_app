import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button, Card, Chip, DemoNote, EmptyState, Field, FormMessage, inputClass } from '../../../components/ui';
import { cx } from '../../../components/ui/cx';
import { assetUrl } from '../../../lib/assets';
import { MIN_PHOTOS, useBooking, type PhotoSlot } from '../../../app/booking';
import { useServices, useVehicles } from '../../../app/data';
import { platform } from '../../../lib/platform';
import { vehicleLabel } from '../../../core/rows';
import {
  CONDITION_COPY,
  SIZE_LABEL,
  SURCHARGES,
  formatDelta,
  formatDuration,
  formatMoney,
  sizeClassFor,
} from '../../../core/pricing';
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
  const { services, state, retry } = useServices();
  const base = services.filter((s) => !s.isAddon);
  const addons = services.filter((s) => s.isAddon);

  if (state === 'error') {
    return (
      <EmptyState
        title="Couldn’t load the menu"
        body="Check your connection and try again."
        action={<Button onClick={retry}>Try again</Button>}
      />
    );
  }
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
  const { vehicles } = useVehicles();

  return (
    <>
      <StepTitle
        title="Which car?"
        body="Size affects the price, so we read it off the vehicle rather than asking you."
      />

      {vehicles.length === 0 && (
        <p className="mb-[var(--space-lg)] text-[14px] leading-[21px] text-[var(--c-ink-muted)]">
          Your garage is empty. Add the car and it&rsquo;s saved for next time.
        </p>
      )}

      <div className="space-y-[var(--space-lg)]">
        {vehicles.map((vehicle) => {
          const active = vehicleId === vehicle.id;
          const size = sizeClassFor(vehicle);
          return (
            <Card
              key={vehicle.id}
              onClick={() => setVehicle(vehicle.id)}
              className={cx(active && 'ring-2 ring-[var(--c-accent)]')}
            >
              <h2 className="text-[15px] leading-[23px]">{vehicleLabel(vehicle)}</h2>
              {vehicle.colour && (
                <p className="mt-[2px] text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
                  {vehicle.colour}
                </p>
              )}
              {/* Stated as a fact with an escape hatch, never as a question. */}
              <p className="mt-[var(--space-sm)] text-[12px] leading-[16px] text-[var(--c-ink-subtle)]">
                {SIZE_LABEL[size]}
                {vehicle.thirdRow && ' · third row'}
              </p>
            </Card>
          );
        })}
      </div>

      <Link
        to="/garage/new?return=/book/vehicle"
        className="eyebrow mt-[var(--space-lg)] block w-full rounded-[var(--radius-full)] border border-dashed border-[var(--c-hairline)] py-[var(--space-lg)] text-center text-[var(--c-ink-muted)]"
      >
        + Add {vehicles.length ? 'another' : 'a'} vehicle
      </Link>
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
  const setPhoto = useBooking((s) => s.setPhoto);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const condition = useBooking((s) => s.condition);
  const setCondition = useBooking((s) => s.setCondition);
  const surcharges = useBooking((s) => s.surcharges);
  const toggleSurcharge = useBooking((s) => s.toggleSurcharge);
  const captured = photos.filter((p) => p.photo).length;

  // Called straight from the tap: Safari only opens the camera from inside a
  // user gesture, so nothing may be awaited before the adapter call.
  const take = (slot: PhotoSlot) => {
    setPhotoError(null);
    platform.camera
      .capture('vehicle-condition')
      .then((photo) => photo && setPhoto(slot, photo))
      .catch(() => setPhotoError('That photo couldn’t be used. Try another.'));
  };

  const fromLibrary = () => {
    setPhotoError(null);
    platform.camera
      .pickFromLibrary('vehicle-condition')
      .then((picked) => {
        // Fill the empty tiles in order; anything beyond four is dropped.
        const empty = useBooking.getState().photos.filter((p) => !p.photo);
        picked.forEach((photo, i) => {
          const slot = empty[i];
          if (slot) setPhoto(slot.slot, photo);
          else platform.camera.release(photo);
        });
      })
      .catch(() => setPhotoError('Those photos couldn’t be used. Try others.'));
  };

  return (
    <>
      {/* Photo-first, not question-first: "show me the car" is what the
          customer wanted to do anyway. The tier is only the pricing proxy. */}
      <StepTitle
        title="Show me the car"
        body="Two photos minimum, four is better. This is what makes the quote accurate before Beezy arrives."
      />

      <div className="grid grid-cols-2 gap-[var(--space-md)]">
        {photos.map((tile) =>
          tile.photo ? (
            <div key={tile.slot} className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--c-accent)]">
              <button
                type="button"
                onClick={() => take(tile.slot)}
                aria-label={`Retake ${tile.label}`}
                className="block w-full"
              >
                <img src={tile.photo.previewUrl} alt={tile.label} className="aspect-[4/3] w-full object-cover" />
              </button>
              <span className="eyebrow pointer-events-none absolute bottom-[var(--space-sm)] left-[var(--space-sm)] rounded-[var(--radius-full)] bg-[var(--c-scrim)] px-[var(--space-md)] py-[2px] text-[9px] text-white">
                {tile.label}
              </span>
              <button
                type="button"
                onClick={() => setPhoto(tile.slot, undefined)}
                aria-label={`Remove ${tile.label} photo`}
                className="absolute right-[var(--space-xs)] top-[var(--space-xs)] flex h-11 w-11 items-center justify-center"
              >
                <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--c-scrim)] text-[14px] text-white">
                  ×
                </span>
              </button>
            </div>
          ) : (
            <button
              key={tile.slot}
              type="button"
              onClick={() => take(tile.slot)}
              className="flex aspect-[4/3] flex-col items-center justify-center gap-[var(--space-sm)] rounded-[var(--radius-card)] border border-dashed border-[var(--c-hairline)] text-center"
            >
              <span aria-hidden className="text-[var(--c-ink-subtle)]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="7" width="18" height="13" rx="2.5" strokeWidth="1.5" />
                  <circle cx="12" cy="13.5" r="3.5" strokeWidth="1.5" />
                  <path d="M8.5 7 10 4.5h4L15.5 7" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="eyebrow text-[9px] text-[var(--c-ink-muted)]">{tile.label}</span>
            </button>
          ),
        )}
      </div>
      <div className="mt-[var(--space-md)] flex items-center justify-between gap-[var(--space-lg)]">
        <p className="text-[12px] leading-[17px] text-[var(--c-ink-subtle)]">
          {captured} of 4 added{captured < MIN_PHOTOS && ` · ${MIN_PHOTOS} needed`}
        </p>
        <button type="button" onClick={fromLibrary} className="eyebrow min-h-11 text-[var(--c-ink-muted)]">
          Choose from photos
        </button>
      </div>
      {photoError && <FormMessage>{photoError}</FormMessage>}

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
    lat: address?.lat,
    lng: address?.lng,
  });
  const [locating, setLocating] = useState(false);
  const [pinNote, setPinNote] = useState<string | null>(null);

  // Optional, and asked for only when tapped: the address alone is enough to
  // book. A pin helps the van find a driveway the map gets wrong.
  const dropPin = async () => {
    setLocating(true);
    setPinNote(null);
    const here = await platform.geolocation.current();
    setLocating(false);
    if (!here) {
      setPinNote('Couldn’t get your location. The address is enough.');
      return;
    }
    update({ lat: here.latitude, lng: here.longitude });
    setPinNote('Pinned. Beezy will drive to exactly where you are now.');
  };

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

        <Card onClick={() => void dropPin()}>
          <div className="flex items-center justify-between gap-[var(--space-lg)]">
            <div className="min-w-0">
              <h3 className="text-[15px] leading-[23px]">
                {form.lat !== undefined ? 'Location pinned' : 'Pin my exact spot'}
              </h3>
              <p className="mt-[2px] text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
                {locating
                  ? 'Finding you…'
                  : 'Optional. Beezy uses your location to confirm your service address and to route the van to you.'}
              </p>
            </div>
            {form.lat !== undefined && <Chip tone="success">Pinned</Chip>}
          </div>
        </Card>
        {pinNote && <p role="status" className="text-[12px] leading-[17px] text-[var(--c-ink-subtle)]">{pinNote}</p>}

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
        Slot lengths come from the live pricing engine. Beezy&rsquo;s own calendar isn&rsquo;t
        connected yet, so the time is a request until Beezy confirms it.
      </DemoNote>
    </>
  );
}

// ---------------------------------------------------------------------------
// 6. Review
// ---------------------------------------------------------------------------

export function StepReview() {
  const draft = useBooking();
  const quote = draft.quote();
  const { services } = useServices();
  const { vehicles } = useVehicles();
  const vehicle = vehicles.find((v) => v.id === draft.vehicleId);
  const names = draft.serviceIds.map((id) => services.find((s) => s.id === id)?.name).filter(Boolean);
  const photos = draft.photos.filter((p) => p.photo).length;

  return (
    <>
      <StepTitle
        title="Look right?"
        body="Send it over and Beezy confirms the time by text. Nothing is charged today."
      />

      <Card>
        <dl className="space-y-[var(--space-lg)]">
          <Row term="When" value={draft.scheduledAt ? fullDate.format(new Date(draft.scheduledAt)) : '—'} />
          <Row term="Service" value={names.join(' + ') || '—'} />
          <Row term="Vehicle" value={vehicle ? vehicleLabel(vehicle) : '—'} />
          <Row term="Where" value={draft.address ? `${draft.address.line1}, ${draft.address.city}` : '—'} />
          <Row term="Photos" value={`${photos} attached`} />
        </dl>
      </Card>

      {quote && (
        <Card className="mt-[var(--space-lg)]">
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
            <span className="money text-[24px] leading-[30px]">{formatMoney(quote.subtotalCents)}</span>
          </div>
          <div className="mt-[var(--space-md)] flex items-baseline justify-between">
            <span className="eyebrow text-[var(--c-accent-text)]">Deposit</span>
            <span className="money text-[20px] leading-[26px] text-[var(--c-accent-text)]">
              {formatMoney(quote.depositCents)}
            </span>
          </div>
        </Card>
      )}

      <DemoNote>
        The deposit isn&rsquo;t taken in the app yet — card payments through Square come next.
        Until then Beezy confirms by text and takes payment on the day.
      </DemoNote>
    </>
  );
}

// ---------------------------------------------------------------------------
// 7. Requested
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
  const { services } = useServices();
  const { vehicles } = useVehicles();

  // Only reachable by sending a request; a deep link lands on the review.
  if (!draft.submitted) return <Navigate to="/book/review" replace />;

  const vehicle = vehicles.find((v) => v.id === draft.vehicleId);
  const names = draft.serviceIds.map((id) => services.find((s) => s.id === id)?.name).filter(Boolean);
  const failed = draft.submitted.failedPhotos;

  return (
    <>
      <div className="mb-[var(--space-2xl)] text-center">
        <div
          aria-hidden
          className="mx-auto mb-[var(--space-lg)] flex h-14 w-14 items-center justify-center rounded-full bg-[var(--c-surface-alt)]"
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
        <h1 className="font-display text-[28px] leading-[34px]">Request sent</h1>
        <p className="mx-auto mt-[var(--space-sm)] max-w-[30ch] text-[15px] leading-[23px] text-[var(--c-ink-muted)]">
          Beezy will confirm the time by text. You&rsquo;ll see it change to Confirmed here too.
        </p>
      </div>

      <Card>
        <dl className="space-y-[var(--space-lg)]">
          <Row term="When" value={draft.scheduledAt ? fullDate.format(new Date(draft.scheduledAt)) : '—'} />
          <Row term="Service" value={names.join(' + ') || '—'} />
          <Row term="Vehicle" value={vehicle ? vehicleLabel(vehicle) : '—'} />
          <Row term="Where" value={draft.address ? `${draft.address.line1}, ${draft.address.city}` : '—'} />
          {quote && <Row term="Estimate" value={formatMoney(quote.subtotalCents)} />}
        </dl>
      </Card>

      {failed > 0 && (
        <FormMessage>
          {failed === 1 ? 'One photo' : `${failed} photos`} didn&rsquo;t upload. The booking is
          saved; Beezy may ask you to text them over.
        </FormMessage>
      )}

      <div className="mt-[var(--space-lg)]">
        <Link
          to="/"
          onClick={() => useBooking.getState().reset()}
          className="eyebrow block w-full rounded-[var(--radius-full)] py-[var(--space-lg)] text-center text-[var(--c-ink-muted)]"
        >
          Back to home
        </Link>
      </div>
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
