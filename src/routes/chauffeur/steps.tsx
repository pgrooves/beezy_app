import { useState, type ReactNode } from 'react';
import { Card, DemoNote, Field, inputClass } from '../../components/ui';
import { cx } from '../../components/ui/cx';
import { useTrip, type PlaceSlot } from '../../app/trip';
import { formatDelta, formatMoney } from '../../core/pricing';
import {
  CHILD_SEAT_CENTS,
  MAX_CHILD_SEATS,
  MAX_HOURS,
  MAX_STOPS,
  SAMPLE_PLACES,
  TRIP_EXTRAS,
  TRIP_TYPE_LABEL,
  VEHICLE_CLASSES,
  fits,
  hourOf,
  pickupAt,
  vehicleClass,
  type Place,
  type TripType,
} from '../../core/trips';

const StepTitle = ({ title, body }: { title: string; body?: string }) => (
  <div className="mb-[var(--space-xl)]">
    <h1 className="font-display text-[28px] leading-[34px]">{title}</h1>
    {body && <p className="mt-[var(--space-sm)] text-[15px] leading-[23px] text-[var(--c-ink-muted)]">{body}</p>}
  </div>
);

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mt-[var(--space-2xl)] first:mt-0">
    <h2 className="eyebrow mb-[var(--space-lg)] text-[var(--c-ink-subtle)]">{title}</h2>
    {children}
  </section>
);

const clock = (hours: number) => {
  const h = ((hours % 24) + 24) % 24;
  const d = new Date(2000, 0, 1, Math.floor(h), Math.round((h % 1) * 60));
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const TYPE_HINT: Record<TripType, string> = {
  p2p: 'One way across town, or add the return leg below.',
  airport: 'We watch the flight and move the pickup if it lands early or late.',
  hourly: 'Your chauffeur waits wherever you stop. Change the plan on the night.',
};

// ---------------------------------------------------------------------------
// 1. Build
// ---------------------------------------------------------------------------

export function StepBuild() {
  const trip = useTrip();
  const [picking, setPicking] = useState<PlaceSlot | null>(null);
  const cls = vehicleClass(trip.vehicleClass);

  const choose = (place: Place) => {
    if (picking) trip.setPlace(picking, place);
    setPicking(null);
  };

  return (
    <>
      <StepTitle title="Where are we going?" body="Add as many stops as you like. The estimate updates as you go." />

      <Section title="Trip">
        <div role="group" aria-label="Trip type" className="grid grid-cols-3 gap-[3px] rounded-[var(--radius-md)] bg-[var(--c-surface-alt)] p-[3px]">
          {(Object.keys(TRIP_TYPE_LABEL) as TripType[]).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={trip.type === type}
              onClick={() => trip.setType(type)}
              className={cx(
                'rounded-[calc(var(--radius-md)-3px)] px-[var(--space-sm)] text-[14px] leading-[20px] transition-colors',
                trip.type === type
                  ? 'bg-[var(--c-surface)] text-[var(--c-ink)] shadow-sm'
                  : 'text-[var(--c-ink-muted)]',
              )}
            >
              {TRIP_TYPE_LABEL[type]}
            </button>
          ))}
        </div>
        <p className="mt-[var(--space-md)] text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">{TYPE_HINT[trip.type]}</p>
      </Section>

      <Section title="When">
        <div className="grid grid-cols-2 gap-[var(--space-md)]">
          <Field label="Date">
            <input
              id="trip-date"
              type="date"
              className={cx(inputClass, 'tabular')}
              value={trip.date}
              onChange={(e) => e.target.value && trip.setWhen({ date: e.target.value })}
            />
          </Field>
          <Field label={trip.type === 'airport' ? 'Lands at' : 'Pickup'}>
            <input
              id="trip-time"
              type="time"
              className={cx(inputClass, 'tabular')}
              value={trip.time}
              onChange={(e) => e.target.value && trip.setWhen({ time: e.target.value })}
            />
          </Field>
        </div>
        {trip.type === 'hourly' && (
          <div className="mt-[var(--space-md)]">
            <Stepper
              label="Hours"
              value={trip.hours}
              min={1}
              max={MAX_HOURS}
              onChange={trip.setHours}
              note={
                trip.hours < cls.minHours
                  ? `${cls.minHours}-hour minimum for this vehicle`
                  : `Until ${clock(hourOf(trip.time) + trip.hours)}`
              }
            />
          </div>
        )}
        {trip.type === 'airport' && (
          <div className="mt-[var(--space-md)]">
            <Field label="Flight number">
              <input
                id="trip-flight"
                className={inputClass}
                value={trip.flight}
                placeholder="DL 1423"
                autoCapitalize="characters"
                onChange={(e) => trip.setFlight(e.target.value)}
              />
            </Field>
          </div>
        )}
      </Section>

      <Section title="Itinerary">
        <Card padded={false}>
          <ol className="px-[var(--space-xl)]">
            <RouteRow role="Pickup" place={trip.pickup} marker="start" onEdit={() => setPicking({ kind: 'pickup' })} />
            {trip.stops.map((stop, i) => (
              <RouteRow
                key={`${stop.id}-${i}`}
                role={`Stop ${i + 1}`}
                place={stop}
                marker="stop"
                onEdit={() => setPicking({ kind: 'stop', index: i })}
                onRemove={() => trip.removeStop(i)}
              />
            ))}
            <RouteRow role="Drop-off" place={trip.dropoff} marker="end" onEdit={() => setPicking({ kind: 'dropoff' })} />
          </ol>
        </Card>

        {picking ? (
          <PlacePicker slot={picking} onPick={choose} onCancel={() => setPicking(null)} />
        ) : (
          trip.stops.length < MAX_STOPS && (
            <button
              type="button"
              onClick={() => setPicking({ kind: 'newStop' })}
              className="mt-[var(--space-md)] flex w-full items-center gap-[var(--space-md)] rounded-[var(--radius-card)] border border-dashed border-[var(--c-hairline)] px-[var(--space-xl)] text-[15px] leading-[23px]"
            >
              <span aria-hidden className="text-[18px]">+</span> Add a stop
            </button>
          )
        )}

        {trip.type !== 'hourly' && (
          <div className="mt-[var(--space-md)]">
            <Card>
              <div className="flex items-center justify-between gap-[var(--space-lg)]">
                <span className="min-w-0">
                  <span className="block text-[15px] leading-[23px]">Return trip</span>
                  <span className="block text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">Same route back, same chauffeur</span>
                </span>
                <Switch label="Return trip" on={trip.returnTrip} onToggle={trip.toggleReturn} />
              </div>
            </Card>
          </div>
        )}
      </Section>

      <Section title="Who’s riding">
        {/* Stacked, not side by side: at phone width two steppers leave the
            label no room beside the buttons. */}
        <div className="space-y-[var(--space-md)]">
          <Stepper label="Passengers" value={trip.passengers} min={1} max={12} onChange={(n) => trip.setParty({ passengers: n })} />
          <Stepper label="Bags" value={trip.bags} min={0} max={12} onChange={(n) => trip.setParty({ bags: n })} />
        </div>
      </Section>

      <Section title="Vehicle">
        <div role="radiogroup" aria-label="Vehicle" className="space-y-[var(--space-md)]">
          {VEHICLE_CLASSES.map((v) => {
            const ok = fits(v, trip.passengers, trip.bags);
            const active = trip.vehicleClass === v.id;
            const price =
              trip.type === 'hourly'
                ? `${formatMoney(v.hourlyCents)}/hr`
                : trip.type === 'airport'
                  ? formatMoney(v.airportCents)
                  : `from ${formatMoney(v.baseCents)}`;
            return (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={!ok}
                onClick={() => trip.setVehicleClass(v.id)}
                className={cx(
                  'block w-full rounded-[var(--radius-card)] border border-[var(--c-hairline)] bg-[var(--c-surface)] p-[var(--space-xl)] text-left transition-transform',
                  active && 'ring-2 ring-[var(--c-accent)]',
                  ok ? 'active:scale-[0.99]' : 'cursor-not-allowed opacity-45',
                )}
              >
                <span className="flex items-baseline justify-between gap-[var(--space-lg)]">
                  <span className="font-display text-[20px] leading-[26px]">{v.name}</span>
                  <span className="tabular shrink-0 text-[15px] leading-[23px]">{price}</span>
                </span>
                <span className="mt-[var(--space-xs)] block text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
                  {ok
                    ? `${v.example} · ${v.seats} seats · ${v.bags} bags${trip.type === 'hourly' ? ` · ${v.minHours}-hour minimum` : ''}`
                    : `Seats ${v.seats}, bags ${v.bags}. Too small for this party`}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Extras">
        <div className="flex flex-wrap gap-[var(--space-sm)]">
          {TRIP_EXTRAS.map((extra) => {
            const on = trip.extras.includes(extra.id);
            return (
              <button
                key={extra.id}
                type="button"
                aria-pressed={on}
                onClick={() => trip.toggleExtra(extra.id)}
                className={cx(
                  'rounded-[var(--radius-full)] border px-[var(--space-lg)] text-[14px] leading-[20px] transition-colors',
                  on
                    ? 'border-[var(--c-brand)] bg-[var(--c-brand)] text-[var(--c-on-brand)]'
                    : 'border-[var(--c-hairline)] bg-[var(--c-surface)] text-[var(--c-ink)]',
                )}
              >
                {extra.label} <span className="tabular opacity-70">{formatMoney(extra.priceCents)}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-[var(--space-md)]">
          <Stepper
            label="Child seats"
            value={trip.childSeats}
            min={0}
            max={MAX_CHILD_SEATS}
            onChange={trip.setChildSeats}
            note={`${formatMoney(CHILD_SEAT_CENTS)} each`}
          />
        </div>
        <p className="mt-[var(--space-md)] text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">
          Bottled water and phone chargers are always on board.
        </p>
      </Section>

      <DemoNote>
        Preview. Rates are examples until Beezy sets its own, and places come from a short list
        until address search is added.
      </DemoNote>
    </>
  );
}

function RouteRow({
  role,
  place,
  marker,
  onEdit,
  onRemove,
}: {
  role: string;
  place: Place;
  marker: 'start' | 'stop' | 'end';
  onEdit: () => void;
  onRemove?: () => void;
}) {
  return (
    <li className="flex items-center gap-[var(--space-md)] border-b border-[var(--c-hairline)] last:border-b-0">
      <span
        aria-hidden
        className={cx(
          'shrink-0 border-2',
          marker === 'stop' ? 'h-2 w-2 rounded-full border-[var(--c-ink-muted)]' : 'h-[10px] w-[10px] border-[var(--c-ink)]',
          marker === 'start' && 'rounded-full',
          marker === 'end' && 'rounded-[2px] bg-[var(--c-ink)]',
        )}
      />
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 py-[var(--space-md)] text-left" aria-label={`${role}: ${place.name}. Change`}>
        <span className="eyebrow block text-[10px] text-[var(--c-ink-subtle)]">{role}</span>
        <span className="block truncate text-[15px] leading-[23px]">{place.name}</span>
        <span className="block truncate text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">{place.address}</span>
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${place.name}`}
          className="-mr-[var(--space-sm)] flex h-11 w-11 shrink-0 items-center justify-center text-[20px] text-[var(--c-ink-muted)]"
        >
          ×
        </button>
      )}
    </li>
  );
}

const SLOT_TITLE: Record<PlaceSlot['kind'], string> = {
  pickup: 'Pick up from',
  dropoff: 'Drop off at',
  stop: 'Change this stop',
  newStop: 'Add a stop',
};

function PlacePicker({ slot, onPick, onCancel }: { slot: PlaceSlot; onPick: (p: Place) => void; onCancel: () => void }) {
  const [address, setAddress] = useState('');
  const typed = address.trim();
  return (
    <div className="mt-[var(--space-md)]">
      <Card padded={false}>
        <div className="flex items-center justify-between border-b border-[var(--c-hairline)] px-[var(--space-xl)]">
          <h3 className="eyebrow text-[var(--c-ink-subtle)]">{SLOT_TITLE[slot.kind]}</h3>
          <button type="button" onClick={onCancel} className="eyebrow px-[var(--space-sm)] text-[var(--c-ink-muted)]">
            Cancel
          </button>
        </div>
        <form
          className="flex gap-[var(--space-sm)] border-b border-[var(--c-hairline)] px-[var(--space-xl)] py-[var(--space-md)]"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed) onPick({ id: `typed-${typed.toLowerCase()}`, name: typed, address: 'Address you entered' });
          }}
        >
          <input
            id="trip-address"
            className={cx(inputClass, 'min-w-0 flex-1')}
            placeholder="Type an address"
            aria-label="Type an address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button
            type="submit"
            disabled={!typed}
            className={cx('eyebrow shrink-0 rounded-[var(--radius-full)] bg-[var(--c-brand)] px-[var(--space-lg)] text-[var(--c-on-brand)]', !typed && 'opacity-30')}
          >
            Use
          </button>
        </form>
        <ul className="px-[var(--space-xl)]">
          {SAMPLE_PLACES.map((place) => (
            <li key={place.id} className="border-b border-[var(--c-hairline)] last:border-b-0">
              <button type="button" onClick={() => onPick(place)} className="w-full py-[var(--space-md)] text-left">
                <span className="block text-[15px] leading-[23px]">{place.name}</span>
                <span className="block text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">{place.address}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  note,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  note?: string;
}) {
  const btn =
    'flex h-11 w-11 items-center justify-center rounded-full border border-[var(--c-hairline)] bg-[var(--c-surface-alt)] text-[18px] disabled:opacity-35';
  return (
    <Card>
      <div className="flex items-center justify-between gap-[var(--space-md)]">
        <div className="min-w-0">
          <p className="text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">{label}</p>
          <p className="tabular text-[22px] leading-[28px]" aria-live="polite">{value}</p>
          {note && <p className="text-[12px] leading-[16px] text-[var(--c-ink-subtle)]">{note}</p>}
        </div>
        <div className="flex shrink-0 gap-[var(--space-xs)]">
          <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Fewer ${label.toLowerCase()}`}>
            −
          </button>
          <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`More ${label.toLowerCase()}`}>
            +
          </button>
        </div>
      </div>
    </Card>
  );
}

function Switch({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={cx(
        'relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors',
        on ? 'bg-[var(--c-success)]' : 'bg-[var(--c-hairline)]',
      )}
      style={{ minHeight: 31 }}
    >
      <span
        aria-hidden
        className="absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-transform"
        style={{ transform: on ? 'translateX(20px)' : 'none' }}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// 2. Review
// ---------------------------------------------------------------------------

const fullDate = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function StepReview() {
  const trip = useTrip();
  const quote = trip.quote();
  const cls = vehicleClass(trip.vehicleClass);
  const route = [trip.pickup, ...trip.stops, trip.dropoff];

  return (
    <>
      <StepTitle title="Look right?" body="Beezy confirms the time and your chauffeur, then takes the deposit." />

      <Card>
        <dl className="space-y-[var(--space-lg)]">
          <Row term="When" value={fullDate.format(pickupAt(trip))} />
          <Row
            term="Trip"
            value={`${TRIP_TYPE_LABEL[trip.type]}${trip.type === 'hourly' ? `, ${quote.hours} hours` : ''}${trip.returnTrip ? ', with return' : ''}`}
          />
          {trip.type === 'airport' && <Row term="Flight" value={trip.flight} />}
          <Row term="Vehicle" value={`${cls.name} · ${cls.example}`} />
          <Row term="Party" value={`${trip.passengers} passenger${trip.passengers === 1 ? '' : 's'} · ${trip.bags} bag${trip.bags === 1 ? '' : 's'}`} />
        </dl>
      </Card>

      <Card className="mt-[var(--space-lg)]">
        <h2 className="eyebrow mb-[var(--space-md)] text-[var(--c-ink-subtle)]">Route</h2>
        <ol className="space-y-[var(--space-sm)]">
          {route.map((place, i) => (
            <li key={`${place.id}-${i}`} className="flex gap-[var(--space-md)]">
              <span className="tabular w-5 shrink-0 text-[13px] leading-[23px] text-[var(--c-ink-subtle)]">{i + 1}</span>
              <span className="min-w-0">
                <span className="block text-[15px] leading-[23px]">{place.name}</span>
                <span className="block text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">{place.address}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="mt-[var(--space-lg)]">
        <ul className="space-y-[var(--space-md)]">
          {quote.lines.map((line, i) => (
            <li key={i} className="flex items-baseline justify-between gap-[var(--space-lg)]">
              <span className="min-w-0">
                <span className="block text-[14px] leading-[21px]">{line.label}</span>
                {line.detail && <span className="block text-[12px] leading-[16px] text-[var(--c-ink-subtle)]">{line.detail}</span>}
              </span>
              <span className="tabular shrink-0 text-[14px] leading-[21px]">
                {i === 0 ? formatMoney(line.amountCents) : formatDelta(line.amountCents)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-[var(--space-lg)] flex items-baseline justify-between border-t border-[var(--c-hairline)] pt-[var(--space-lg)]">
          <span className="eyebrow text-[var(--c-ink-subtle)]">Estimated total</span>
          <span className="money text-[24px] leading-[30px]">{formatMoney(quote.totalCents)}</span>
        </div>
        <div className="mt-[var(--space-md)] flex items-baseline justify-between">
          <span className="eyebrow text-[var(--c-accent-text)]">Deposit</span>
          <span className="money text-[20px] leading-[26px] text-[var(--c-accent-text)]">{formatMoney(quote.depositCents)}</span>
        </div>
      </Card>

      <Card className="mt-[var(--space-lg)]">
        <h2 className="eyebrow mb-[var(--space-md)] text-[var(--c-ink-subtle)]">What happens next</h2>
        <ol className="space-y-[var(--space-sm)] text-[14px] leading-[21px] text-[var(--c-ink-muted)]">
          <li>1. Beezy confirms the time, usually within the hour.</li>
          <li>2. The deposit is taken, and nothing before that.</li>
          <li>3. The trip goes on your calendar and updates if the time changes.</li>
          <li>4. The day before, you get your chauffeur&rsquo;s name and the plate.</li>
        </ol>
      </Card>

      <DemoNote>
        Chauffeur is in preview, so nothing is sent from here yet. Requests open once Beezy has set
        its rates and vehicles.
      </DemoNote>
    </>
  );
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-[var(--space-lg)]">
      <dt className="eyebrow shrink-0 text-[var(--c-ink-subtle)]">{term}</dt>
      <dd className="min-w-0 text-right text-[15px] leading-[23px]">{value}</dd>
    </div>
  );
}
