import { Navigate, useNavigate } from 'react-router-dom';
import { Card, Chip, Screen, ScreenHeader } from '../../components/ui';
import { useSession } from '../../app/session';
import { useLine } from '../../app/line';
import { firstName } from '../../core/profile';
import { LINES, LINE_ORDER, type BusinessLine } from '../../core/lines';
import { assetUrl } from '../../lib/assets';

/**
 * `/`, the launch route (DECISIONS.md#0024).
 *
 * Staff go to Today. A customer who has already chosen a line goes straight
 * back to it; anyone else gets the front door. Renders nothing until both the
 * session and the stored choice are read, so the door never flashes past on
 * the way to a remembered line.
 */
export function Launch() {
  const status = useSession((s) => s.status);
  const role = useSession((s) => s.role);
  const line = useLine((s) => s.line);
  const loaded = useLine((s) => s.loaded);

  if (status === 'loading' || !loaded) return null;
  if (role !== 'customer') return <Navigate to="/admin" replace />;
  if (line) return <Navigate to={LINES[line].home} replace />;
  return <FrontDoor />;
}

/** The choice between Detailing and Chauffeur. Always shown at `/choose`. */
export function FrontDoor() {
  const status = useSession((s) => s.status);
  const profile = useSession((s) => s.profile);
  const choose = useLine((s) => s.choose);
  const navigate = useNavigate();

  const name = status === 'signedIn' && profile ? firstName(profile) : '';
  const open = (line: BusinessLine) => {
    choose(line);
    navigate(LINES[line].home);
  };

  return (
    <Screen>
      <ScreenHeader eyebrow="Choose a service" title={name || 'Beezy'} />

      <div className="mt-[var(--space-lg)] space-y-[var(--space-lg)]">
        {LINE_ORDER.map((id) => {
          const line = LINES[id];
          return (
            <Card key={id} onClick={() => open(id)} padded={false}>
              {/* Decorative inside the button: the label below names it. */}
              <img
                src={assetUrl(line.photo)}
                alt=""
                className="aspect-[16/9] w-full object-cover"
              />
              <div className="px-[var(--space-xl)] py-[var(--space-lg)]">
                <div className="flex items-center justify-between gap-[var(--space-md)]">
                  <span className="font-display text-[24px] leading-[30px]">{line.label}</span>
                  {!line.live && <Chip>Preview</Chip>}
                </div>
                <p className="mt-[var(--space-xs)] text-[14px] leading-[21px] text-[var(--c-ink-muted)]">
                  {line.tagline}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      <p className="mt-[var(--space-xl)] text-center text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">
        One account for both. Switch any time from More.
      </p>
    </Screen>
  );
}
