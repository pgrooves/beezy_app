import { useNavigate } from 'react-router-dom';
import { Button, Card, DemoNote, EmptyState, ListRow, Screen, ScreenHeader, SectionHeader } from '../../components/ui';
import { LineSwitch } from '../../components/nav/LineSwitch';
import { useTrip, type TripPreset } from '../../app/trip';
import { LINES } from '../../core/lines';
import { formatMoney } from '../../core/pricing';
import { SAMPLE_PLACES, VEHICLE_CLASSES } from '../../core/trips';
import { assetUrl } from '../../lib/assets';

const PRESETS: { id: TripPreset; title: string; body: string }[] = [
  { id: 'airport', title: 'Airport', body: 'MSY pickups and drop-offs, flight tracked' },
  { id: 'hourly', title: 'By the hour', body: 'Dinner, Jazz Fest, a night out' },
  { id: 'p2p', title: 'Point to point', body: 'Across town, one way or return' },
  { id: 'group', title: 'Group', body: 'A Sprinter for up to 12' },
];

/**
 * Chauffeur's home. A preview on sample rates until step C3
 * (DECISIONS.md#0025): the trip builder works end to end, but nothing is
 * requested from it yet, and the screen says so.
 */
export default function ChauffeurHome() {
  const navigate = useNavigate();
  const startFrom = useTrip((s) => s.startFrom);
  const line = LINES.chauffeur;

  const start = (preset: TripPreset) => {
    startFrom(preset);
    navigate('/chauffeur/book/build');
  };

  return (
    <Screen>
      <ScreenHeader eyebrow="Private car and driver" title="Chauffeur" action={<LineSwitch line="chauffeur" />} />

      <div className="mt-[var(--space-lg)]">
        <Card padded={false}>
          <img src={assetUrl(line.photo)} alt={line.photoAlt} className="aspect-[16/10] w-full object-cover" />
          <div className="flex items-center justify-between gap-[var(--space-lg)] p-[var(--space-xl)]">
            <div className="min-w-0">
              <p className="eyebrow text-[var(--c-ink-subtle)]">Where to?</p>
              <p className="font-display mt-[var(--space-xs)] text-[22px] leading-[28px]">Build a trip</p>
            </div>
            <Button to="/chauffeur/book/build">Start</Button>
          </div>
        </Card>
      </div>

      <SectionHeader title="Start from" />
      <div className="grid grid-cols-2 gap-[var(--space-md)]">
        {PRESETS.map((p) => (
          <Card key={p.id} onClick={() => start(p.id)} className="min-h-[104px]">
            <span className="font-display block text-[18px] leading-[24px]">{p.title}</span>
            <span className="mt-[var(--space-sm)] block text-[13px] leading-[18px] text-[var(--c-ink-muted)]">{p.body}</span>
          </Card>
        ))}
      </div>

      <SectionHeader title="The vehicles" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          {VEHICLE_CLASSES.map((v) => (
            <ListRow
              key={v.id}
              label={v.name}
              detail={`${v.example} · ${v.seats} seats`}
              trailing={<span className="tabular text-[14px] text-[var(--c-ink-muted)]">{formatMoney(v.hourlyCents)}/hr</span>}
            />
          ))}
        </div>
      </Card>

      <DemoNote>
        Chauffeur is in preview. Rates are examples until Beezy sets its own, and trips can&rsquo;t
        be requested yet.
      </DemoNote>
    </Screen>
  );
}

export function ChauffeurTrips() {
  return (
    <Screen>
      <ScreenHeader eyebrow="Chauffeur" title="Trips" />
      <div className="mt-[var(--space-lg)]">
        <EmptyState
          title="No trips yet"
          body="Trips you request show here, with your chauffeur and the vehicle once Beezy confirms."
          action={<Button to="/chauffeur/book/build">Build a trip</Button>}
        />
      </div>
    </Screen>
  );
}

export function ChauffeurPlaces() {
  return (
    <Screen>
      <ScreenHeader eyebrow="Chauffeur" title="Places" />
      <div className="mt-[var(--space-lg)]">
        <Card padded={false}>
          <div className="px-[var(--space-xl)]">
            {SAMPLE_PLACES.map((p) => (
              <ListRow key={p.id} label={p.name} detail={p.address} />
            ))}
          </div>
        </Card>
      </div>
      <DemoNote>
        Sample places. Saving your own (home, work, a favourite restaurant) comes with real trips.
      </DemoNote>
    </Screen>
  );
}
