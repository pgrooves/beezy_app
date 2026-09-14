import { useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Chip,
  DemoNote,
  EmptyState,
  ListRow,
  Screen,
  DetailHeader,
  ScreenHeader,
  SectionHeader,
} from '../../components/ui';
import { assetUrl } from '../../lib/assets';
import { SIZE_LABEL, formatMoney, sizeClassFor } from '../../core/pricing';
import { BOOKINGS, VEHICLES, serviceById, vehicleById } from '../../core/fixtures';

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
  return (
    <Screen>
      <ScreenHeader eyebrow="Your" title="Garage" />

      {VEHICLES.length === 0 ? (
        <EmptyState
          title="No vehicles yet"
          body="Add a car and Beezy will remember its size, history and coating status."
          action={<Button>Add a vehicle</Button>}
        />
      ) : (
        <div className="space-y-[var(--space-lg)]">
          {VEHICLES.map((vehicle) => {
            const days = warrantyDays(vehicle.coatingWarrantyExpiresAt);
            return (
              <Card key={vehicle.id} to={`/garage/${vehicle.id}`} padded={false}>
                {vehicle.photoUrl && (
                  <img
                    src={assetUrl(vehicle.photoUrl)}
                    alt=""
                    className="aspect-[16/9] w-full object-cover"
                    loading="lazy"
                  />
                )}
                <div className="p-[var(--space-xl)]">
                  <div className="flex items-start justify-between gap-[var(--space-lg)]">
                    <div className="min-w-0">
                      <h2 className="font-display text-[20px] leading-[26px]">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h2>
                      <p className="mt-[var(--space-xs)] text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
                        {vehicle.colour} · {SIZE_LABEL[sizeClassFor(vehicle)]}
                      </p>
                    </div>
                    {days !== null && days > 0 && <Chip tone="accent">Coated</Chip>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className="eyebrow mt-[var(--space-lg)] w-full rounded-[var(--radius-full)] border border-dashed border-[var(--c-hairline)] py-[var(--space-lg)] text-[var(--c-ink-muted)]"
      >
        + Add a vehicle
      </button>

      <DemoNote>Demo vehicles. Adding and editing arrive with the backend.</DemoNote>
    </Screen>
  );
}

export function VehicleDetail() {
  const { vehicleId } = useParams();
  const vehicle = vehicleId ? vehicleById(vehicleId) : undefined;

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

  const history = BOOKINGS.filter((b) => b.vehicleId === vehicle.id);
  const days = warrantyDays(vehicle.coatingWarrantyExpiresAt);

  return (
    <Screen>
      <DetailHeader to="/garage" label="Garage" />

      {vehicle.photoUrl && (
        <img
          src={assetUrl(vehicle.photoUrl)}
          alt=""
          className="aspect-[16/9] w-full rounded-[var(--radius-card)] object-cover"
        />
      )}

      <h1 className="font-display mt-[var(--space-xl)] text-[28px] leading-[34px]">
        {vehicle.year} {vehicle.make} {vehicle.model}
      </h1>
      <p className="mt-[var(--space-xs)] text-[14px] leading-[21px] text-[var(--c-ink-muted)]">
        {vehicle.colour} · {SIZE_LABEL[sizeClassFor(vehicle)]}
        {vehicle.thirdRow && ' · third row'}
        {vehicle.plate && ` · ${vehicle.plate}`}
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
                label={booking.serviceIds.map((id) => serviceById(id)?.name).join(' + ')}
                detail={dateFormat.format(new Date(booking.scheduledAt))}
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
        <Button to="/book" full>
          Book this car
        </Button>
        <Button variant="secondary" full>
          Edit details
        </Button>
      </div>
    </Screen>
  );
}
