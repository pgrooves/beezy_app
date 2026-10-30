import { Button, DemoNote, DetailHeader, Screen } from '../../components/ui';
import { LINES } from '../../core/lines';
import { assetUrl } from '../../lib/assets';

/**
 * Chauffeur's placeholder home.
 *
 * The line is scoped but not built (DECISIONS.md#0024, step C2 onwards). This
 * screen says so plainly rather than showing a booking flow that goes
 * nowhere, and it has no tab bar of its own yet: the way out is back to the
 * door.
 */
export default function ChauffeurHome() {
  const line = LINES.chauffeur;
  return (
    <Screen>
      <DetailHeader to="/choose" label="Choose a service" />

      <p className="eyebrow mt-[var(--space-lg)] text-[var(--c-ink-subtle)]">Coming soon</p>
      <h1 className="display-caps mt-[var(--space-xs)]">{line.label}</h1>

      <div className="mt-[var(--space-xl)] overflow-hidden rounded-[var(--radius-card)]">
        <img src={assetUrl(line.photo)} alt={line.photoAlt} className="aspect-[4/3] w-full object-cover" />
      </div>

      <p className="mt-[var(--space-xl)] text-[17px] leading-[26px] text-[var(--c-ink-muted)]">
        A private car and driver from Beezy, for airport runs, a night out or a whole day. You
        will plan the trip stop by stop, see the price as you go, and get it on your calendar.
      </p>
      <p className="mt-[var(--space-lg)] text-[15px] leading-[23px] text-[var(--c-ink-muted)]">
        It will use the same account you use for detailing.
      </p>

      <div className="mt-[var(--space-xl)]">
        <Button to={LINES.detailing.home} variant="secondary" full>
          Go to Detailing
        </Button>
      </div>

      <DemoNote>Chauffeur bookings aren&rsquo;t open yet. Nothing on this screen books a trip.</DemoNote>
    </Screen>
  );
}
