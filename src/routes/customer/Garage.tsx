import { useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  Chip,
  DetailHeader,
  EmptyState,
  Field,
  FormMessage,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
  inputClass,
} from '../../components/ui';
import { cx } from '../../components/ui/cx';
import { useBookings, useData, useServices, useVehicles } from '../../app/data';
import { decodeVin } from '../../app/vin';
import { SIZE_LABEL, formatMoney, sizeClassFor } from '../../core/pricing';
import {
  BODY_TYPE_LABEL,
  STATUS_LABEL,
  validateVehicle,
  vehicleLabel,
  type VehicleInput,
} from '../../core/rows';
import { platform } from '../../lib/platform';
import type { BodyType, Vehicle } from '../../core/types';

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/** Days until a coating warranty lapses, or null if there is no coating. */
function warrantyDays(iso?: string): number | null {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export default function Garage() {
  const { vehicles, state, retry } = useVehicles();

  return (
    <Screen>
      <ScreenHeader eyebrow="Your" title="Garage" />

      {state === 'error' ? (
        <EmptyState
          title="Couldn’t load your garage"
          body="Check your connection and try again."
          action={<Button onClick={retry}>Try again</Button>}
        />
      ) : state !== 'ready' ? (
        <p className="mt-[var(--space-xl)] text-[14px] text-[var(--c-ink-subtle)]">Loading…</p>
      ) : vehicles.length === 0 ? (
        <EmptyState
          title="No vehicles yet"
          body="Add a car and Beezy will remember its size, history and coating status."
          action={<Button to="/garage/new">Add a vehicle</Button>}
        />
      ) : (
        <>
          <div className="space-y-[var(--space-lg)]">
            {vehicles.map((vehicle) => {
              const days = warrantyDays(vehicle.coatingWarrantyExpiresAt);
              return (
                <Card key={vehicle.id} to={`/garage/${vehicle.id}`}>
                  <div className="flex items-start justify-between gap-[var(--space-lg)]">
                    <div className="min-w-0">
                      <h2 className="font-display text-[20px] leading-[26px]">
                        {vehicleLabel(vehicle)}
                      </h2>
                      <p className="mt-[var(--space-xs)] text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
                        {[vehicle.colour, SIZE_LABEL[sizeClassFor(vehicle)]].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {days !== null && days > 0 && <Chip tone="accent">Coated</Chip>}
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="mt-[var(--space-lg)]">
            <Button to="/garage/new" variant="secondary" full>
              + Add a vehicle
            </Button>
          </div>
        </>
      )}
    </Screen>
  );
}

export function VehicleDetail() {
  const { vehicleId } = useParams();
  const { vehicles, state } = useVehicles();
  const { bookings } = useBookings();
  const { services } = useServices();
  const removeVehicle = useData((s) => s.removeVehicle);
  const navigate = useNavigate();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vehicle = vehicles.find((v) => v.id === vehicleId);

  if (state !== 'ready') {
    return (
      <Screen>
        <DetailHeader to="/garage" label="Garage" />
      </Screen>
    );
  }

  if (!vehicle) {
    return (
      <Screen>
        <ScreenHeader title="Not found" />
        <EmptyState
          title="No such vehicle"
          body="It may have been removed from the garage."
          action={<Button to="/garage">Back to Garage</Button>}
        />
      </Screen>
    );
  }

  const history = bookings.filter((b) => b.vehicleId === vehicle.id && b.status !== 'cancelled');
  const days = warrantyDays(vehicle.coatingWarrantyExpiresAt);
  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? 'Service';

  return (
    <Screen>
      <DetailHeader to="/garage" label="Garage" />

      <h1 className="font-display mt-[var(--space-xl)] text-[28px] leading-[34px]">
        {vehicleLabel(vehicle)}
      </h1>
      <p className="mt-[var(--space-xs)] text-[14px] leading-[21px] text-[var(--c-ink-muted)]">
        {[vehicle.colour, SIZE_LABEL[sizeClassFor(vehicle)], vehicle.thirdRow && 'third row', vehicle.plate]
          .filter(Boolean)
          .join(' · ')}
      </p>

      {days !== null && (
        <Card className="mt-[var(--space-xl)]">
          <div className="flex items-center justify-between gap-[var(--space-lg)]">
            <div>
              <p className="eyebrow text-[var(--c-accent-text)]">Ceramic coating</p>
              <p className="mt-[var(--space-xs)] text-[14px] leading-[21px] text-[var(--c-ink-muted)]">
                {days > 0
                  ? `Protected until ${dateFormat.format(new Date(vehicle.coatingWarrantyExpiresAt!))}`
                  : 'Warranty has lapsed'}
              </p>
            </div>
            <Chip tone={days > 90 ? 'success' : 'warning'}>
              {days > 0 ? `${Math.round(days / 30)} mo left` : 'Expired'}
            </Chip>
          </div>
        </Card>
      )}

      {vehicle.notes && (
        <>
          <SectionHeader title="Notes" />
          <Card>
            <p className="text-[14px] leading-[21px] text-[var(--c-ink-muted)]">{vehicle.notes}</p>
          </Card>
        </>
      )}

      <SectionHeader title="Service history" />
      {history.length === 0 ? (
        <EmptyState title="Nothing yet" body="This car hasn't been detailed through the app." />
      ) : (
        <Card padded={false}>
          <div className="px-[var(--space-xl)]">
            {history.map((booking) => (
              <ListRow
                key={booking.id}
                label={booking.serviceIds.map(serviceName).join(' + ')}
                detail={`${dateFormat.format(new Date(booking.scheduledAt))} · ${STATUS_LABEL[booking.status]}`}
                to={`/booking/${booking.id}`}
                trailing={
                  <span className="tabular text-[14px] text-[var(--c-ink-muted)]">
                    {formatMoney(booking.finalCents ?? booking.totalCents)}
                  </span>
                }
              />
            ))}
          </div>
        </Card>
      )}

      <div className="mt-[var(--space-2xl)] space-y-[var(--space-md)]">
        <Button to={`/book/service?vehicle=${vehicle.id}`} full>
          Book this car
        </Button>
        <Button to={`/garage/${vehicle.id}/edit`} variant="secondary" full>
          Edit details
        </Button>
        {!confirmRemove ? (
          <Button variant="ghost" full onClick={() => setConfirmRemove(true)}>
            Remove from garage
          </Button>
        ) : (
          <div className="rounded-[var(--radius-card)] border border-[var(--c-danger)] p-[var(--space-lg)]">
            <p className="text-[14px] leading-[21px] text-[var(--c-ink-muted)]">
              Remove this car? Its past bookings stay in your history.
            </p>
            {error && <FormMessage>{error}</FormMessage>}
            <div className="mt-[var(--space-lg)] flex gap-[var(--space-md)]">
              <Button
                variant="danger"
                onClick={async () => {
                  const result = await removeVehicle(vehicle.id);
                  if (result.error) {
                    setError(result.error);
                    return;
                  }
                  navigate('/garage', { replace: true });
                }}
              >
                Remove
              </Button>
              <Button variant="secondary" onClick={() => setConfirmRemove(false)}>
                Keep it
              </Button>
            </div>
          </div>
        )}
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Add / edit
// ---------------------------------------------------------------------------

const BODY_TYPES = Object.keys(BODY_TYPE_LABEL) as BodyType[];

/** /garage/new and /garage/:vehicleId/edit. `?return=` sends you back after saving. */
export function VehicleForm() {
  const { vehicleId } = useParams();
  const [params] = useSearchParams();
  const { vehicles, state } = useVehicles();
  const existing = vehicleId ? vehicles.find((v) => v.id === vehicleId) : undefined;

  if (vehicleId && state !== 'ready') return <Screen><DetailHeader to="/garage" label="Garage" /></Screen>;
  if (vehicleId && !existing) {
    return (
      <Screen>
        <ScreenHeader title="Not found" />
        <EmptyState title="No such vehicle" body="It may have been removed." action={<Button to="/garage">Back to Garage</Button>} />
      </Screen>
    );
  }
  return <VehicleFormBody key={existing?.id ?? 'new'} existing={existing} returnTo={safeReturn(params.get('return'))} />;
}

function VehicleFormBody({ existing, returnTo }: { existing?: Vehicle; returnTo: string | null }) {
  const saveVehicle = useData((s) => s.saveVehicle);
  const navigate = useNavigate();
  const [form, setForm] = useState<VehicleInput>({
    year: existing?.year ?? 0,
    make: existing?.make ?? '',
    model: existing?.model ?? '',
    colour: existing?.colour ?? '',
    bodyType: existing?.bodyType ?? 'sedan',
    thirdRow: existing?.thirdRow ?? false,
    vin: existing?.vin ?? '',
    plate: existing?.plate ?? '',
    notes: existing?.notes ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [decoding, setDecoding] = useState(false);
  const [message, setMessage] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null);
  const update = (patch: Partial<VehicleInput>) => setForm((f) => ({ ...f, ...patch }));

  const lookUpVin = async () => {
    setDecoding(true);
    setMessage(null);
    const decoded = await decodeVin(form.vin ?? '');
    setDecoding(false);
    if (!decoded) {
      setMessage({ tone: 'danger', text: 'We couldn’t look that VIN up. Fill the details in below instead.' });
      return;
    }
    update({
      year: decoded.year ?? form.year,
      make: decoded.make ?? form.make,
      model: decoded.model ?? form.model,
      bodyType: decoded.bodyType ?? form.bodyType,
      thirdRow: decoded.thirdRow ?? form.thirdRow,
    });
    setMessage({ tone: 'success', text: 'Filled in from the VIN. Check the body type is right.' });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errors = validateVehicle(form);
    if (errors.length) {
      setMessage({ tone: 'danger', text: errors[0]! });
      return;
    }
    setBusy(true);
    const result = await saveVehicle(existing?.id ?? null, form);
    setBusy(false);
    if (result.error || !result.data) {
      setMessage({ tone: 'danger', text: result.error ?? 'That didn’t save.' });
      platform.haptics.error();
      return;
    }
    platform.haptics.success();
    const saved = result.data;
    navigate(returnTo ? withVehicle(returnTo, saved.id) : `/garage/${saved.id}`, { replace: true });
  };

  const vinReady = /^[A-HJ-NPR-Z0-9]{17}$/i.test((form.vin ?? '').trim());

  return (
    <Screen>
      <DetailHeader to={existing ? `/garage/${existing.id}` : returnTo ?? '/garage'} label={existing ? 'Vehicle' : 'Back'} />
      <h1 className="font-display mt-[var(--space-lg)] text-[28px] leading-[34px]">
        {existing ? 'Edit vehicle' : 'Add a vehicle'}
      </h1>
      <p className="mt-[var(--space-sm)] text-[15px] leading-[23px] text-[var(--c-ink-muted)]">
        Size sets the price, so this is the part that matters. Have the VIN handy? We can fill it
        in for you.
      </p>

      <form onSubmit={submit} noValidate className="mt-[var(--space-xl)] space-y-[var(--space-lg)]">
        <Field label="VIN" hint="Optional">
          <div className="flex gap-[var(--space-sm)]">
            <input
              value={form.vin}
              onChange={(e) => update({ vin: e.target.value.toUpperCase() })}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={17}
              placeholder="17 characters"
              className={cx(inputClass, 'tabular')}
            />
            <Button variant="secondary" disabled={!vinReady || decoding} onClick={lookUpVin}>
              {decoding ? '…' : 'Look up'}
            </Button>
          </div>
        </Field>

        <div className="flex gap-[var(--space-lg)]">
          <Field label="Year" className="w-[34%]">
            <input
              value={form.year || ''}
              onChange={(e) => update({ year: Number.parseInt(e.target.value.replace(/\D/g, ''), 10) || 0 })}
              inputMode="numeric"
              maxLength={4}
              placeholder="2023"
              className={cx(inputClass, 'tabular')}
            />
          </Field>
          <Field label="Make" className="flex-1">
            <input value={form.make} onChange={(e) => update({ make: e.target.value })} placeholder="Porsche" className={inputClass} />
          </Field>
        </div>
        <Field label="Model">
          <input value={form.model} onChange={(e) => update({ model: e.target.value })} placeholder="Macan" className={inputClass} />
        </Field>
        <Field label="Colour" hint="Optional">
          <input value={form.colour} onChange={(e) => update({ colour: e.target.value })} placeholder="Carrara White" className={inputClass} />
        </Field>

        <Field label="Body type">
          <select
            value={form.bodyType}
            onChange={(e) => update({ bodyType: e.target.value as BodyType })}
            className={inputClass}
          >
            {BODY_TYPES.map((type) => (
              <option key={type} value={type}>
                {BODY_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </Field>

        <label className="flex items-center justify-between gap-[var(--space-lg)] rounded-[var(--radius-card)] border border-[var(--c-hairline)] bg-[var(--c-surface)] p-[var(--space-lg)]">
          <span className="min-w-0">
            <span className="block text-[15px] leading-[23px]">Third row of seats</span>
            <span className="block text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
              Priced as a full-size vehicle whatever the body type.
            </span>
          </span>
          <input
            type="checkbox"
            checked={form.thirdRow}
            onChange={(e) => update({ thirdRow: e.target.checked })}
            className="h-6 w-6 shrink-0 accent-[var(--c-accent-text)]"
          />
        </label>

        <p className="text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">
          Priced as: <span className="text-[var(--c-ink)]">{SIZE_LABEL[sizeClassFor(form)]}</span>
        </p>

        <Field label="Plate" hint="Optional">
          <input
            value={form.plate}
            onChange={(e) => update({ plate: e.target.value.toUpperCase() })}
            autoCapitalize="characters"
            className={cx(inputClass, 'tabular')}
          />
        </Field>
        <Field label="Notes for Beezy" hint="Optional">
          <textarea
            value={form.notes}
            onChange={(e) => update({ notes: e.target.value })}
            rows={2}
            placeholder="Matte wrap on the hood, please hand-dry."
            className={cx(inputClass, 'resize-none')}
          />
        </Field>

        {message && <FormMessage tone={message.tone}>{message.text}</FormMessage>}
        <Button type="submit" full disabled={busy}>
          {busy ? 'Saving…' : existing ? 'Save changes' : 'Add to garage'}
        </Button>
      </form>
    </Screen>
  );
}

/** Same-app paths only: `return` arrives in the URL. */
function safeReturn(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

/** Hands the new car back to the booking flow so it arrives selected. */
function withVehicle(path: string, vehicleId: string): string {
  return path.startsWith('/book') ? `${path}${path.includes('?') ? '&' : '?'}vehicle=${vehicleId}` : path;
}
