import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, Chip, DemoNote, EmptyState, ListRow, Screen, DetailHeader,
  ScreenHeader, SectionHeader, Stat } from '../../components/ui';
import { cx } from '../../components/ui/cx';
import { formatMoney } from '../../core/pricing';
import { CLIENTS, PIPELINE_BOOKINGS, clientById, serviceById } from '../../core/fixtures';
import type { Client, ClientTag } from '../../core/types';

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const TAG_LABEL: Record<ClientTag, string> = {
  vip: 'VIP',
  fleet: 'Fleet',
  recurring: 'Recurring',
  lapsed: 'Lapsed',
};

const daysSince = (iso?: string) =>
  iso ? Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000) : null;

export default function Clients() {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<ClientTag | null>(null);

  const filtered = CLIENTS.filter((c) => {
    const matchesQuery =
      !query || c.fullName.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query);
    const matchesTag = !tag || c.tags.includes(tag);
    return matchesQuery && matchesTag;
  });

  // The list that turns into money: nobody in 90+ days, one tap to nudge.
  const lapsed = CLIENTS.filter((c) => (daysSince(c.lastServiceAt) ?? 0) >= 90);

  return (
    <Screen>
      <ScreenHeader eyebrow={`${CLIENTS.length} people`} title="Clients" />

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name or phone"
        className="w-full rounded-[var(--radius-full)] border border-[var(--c-hairline)] bg-[var(--c-surface)] px-[var(--space-xl)] py-[var(--space-md)] text-[15px] leading-[23px] outline-none focus:border-[var(--c-accent-text)]"
      />

      <div className="-mx-[var(--space-gutter)] mt-[var(--space-lg)] flex gap-[var(--space-sm)] overflow-x-auto px-[var(--space-gutter)] pb-[var(--space-sm)]">
        <TagChip active={tag === null} onClick={() => setTag(null)}>
          All
        </TagChip>
        {(['vip', 'recurring', 'fleet', 'lapsed'] as ClientTag[]).map((t) => (
          <TagChip key={t} active={tag === t} onClick={() => setTag(t)}>
            {TAG_LABEL[t]}
          </TagChip>
        ))}
      </div>

      {lapsed.length > 0 && tag === null && !query && (
        <>
          <SectionHeader title={`Haven't been back · ${lapsed.length}`} />
          <div className="space-y-[var(--space-md)]">
            {lapsed.map((client) => (
              <Card key={client.id}>
                <div className="flex items-center justify-between gap-[var(--space-lg)]">
                  <div className="min-w-0">
                    <h3 className="text-[15px] leading-[23px]">{client.fullName}</h3>
                    <p className="mt-[2px] text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
                      {daysSince(client.lastServiceAt)} days since the last detail
                    </p>
                  </div>
                  <Button variant="secondary">Nudge</Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <SectionHeader title="Everyone" />
      {filtered.length === 0 ? (
        <EmptyState title="No matches" body="Try a different name or filter." />
      ) : (
        <Card padded={false}>
          <div className="px-[var(--space-xl)]">
            {filtered.map((client) => (
              <ClientRow key={client.id} client={client} />
            ))}
          </div>
        </Card>
      )}

      <DemoNote>Demo client records. The real CRM arrives with the backend.</DemoNote>
    </Screen>
  );
}

function TagChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'eyebrow shrink-0 rounded-[var(--radius-full)] border px-[var(--space-lg)] transition-colors',
        active
          ? 'border-[var(--c-brand)] bg-[var(--c-brand)] text-[var(--c-on-brand)]'
          : 'border-[var(--c-hairline)] text-[var(--c-ink-muted)]',
      )}
      style={{ transitionDuration: 'var(--motion-fast)' }}
    >
      {children}
    </button>
  );
}

function ClientRow({ client }: { client: Client }) {
  return (
    <Link
      to={`/admin/clients/${client.id}`}
      className="flex items-center gap-[var(--space-lg)] border-b border-[var(--c-hairline)] py-[var(--space-lg)] last:border-b-0"
    >
      <span
        aria-hidden
        className="eyebrow flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--c-surface-alt)] text-[var(--c-ink-muted)]"
        style={{ minHeight: 0 }}
      >
        {client.avatarInitials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-[var(--space-sm)]">
          <span className="truncate text-[15px] leading-[23px]">{client.fullName}</span>
          {client.tags.includes('vip') && <Chip tone="accent">VIP</Chip>}
          {client.tags.includes('fleet') && <Chip>Fleet</Chip>}
        </span>
        <span className="block text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">
          {client.jobCount} jobs · {formatMoney(client.lifetimeValueCents)} lifetime
        </span>
      </span>
      <span aria-hidden className="text-[var(--c-ink-subtle)]">
        ›
      </span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Client detail
// ---------------------------------------------------------------------------

export function ClientDetail() {
  const { clientId } = useParams();
  const client = clientId ? clientById(clientId) : undefined;

  if (!client) {
    return (
      <Screen>
        <ScreenHeader title="Not found" />
        <EmptyState title="No such client" body="" action={<Button to="/admin/clients">Back</Button>} />
      </Screen>
    );
  }

  const history = PIPELINE_BOOKINGS.filter((b) => b.clientId === client.id);

  return (
    <Screen>
      <DetailHeader to="/admin/clients" label="Clients" />

      <h1 className="font-display mt-[var(--space-lg)] text-[28px] leading-[34px]">
        {client.fullName}
      </h1>
      <div className="mt-[var(--space-md)] flex flex-wrap gap-[var(--space-sm)]">
        {client.tags.map((t) => (
          <Chip key={t} tone={t === 'vip' ? 'accent' : t === 'lapsed' ? 'warning' : 'neutral'}>
            {TAG_LABEL[t]}
          </Chip>
        ))}
      </div>

      <Card className="mt-[var(--space-xl)]">
        <div className="flex items-start justify-between gap-[var(--space-lg)]">
          <Stat value={formatMoney(client.lifetimeValueCents)} label="lifetime" />
          <Stat value={`${client.jobCount}`} label="jobs" />
          <Stat
            value={`${daysSince(client.lastServiceAt) ?? '—'}d`}
            label="since last"
            tone={(daysSince(client.lastServiceAt) ?? 0) >= 90 ? 'accent' : undefined}
          />
        </div>
      </Card>

      <SectionHeader title="Contact" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          <ListRow label="Phone" trailing={<span className="tabular text-[14px] text-[var(--c-ink-muted)]">{client.phone}</span>} />
          <ListRow label="Email" trailing={<span className="text-[14px] text-[var(--c-ink-muted)]">{client.email}</span>} />
          <ListRow label="Client since" trailing={<span className="text-[14px] text-[var(--c-ink-muted)]">{dateFormat.format(new Date(client.since))}</span>} />
        </div>
      </Card>

      {client.notes && (
        <>
          <SectionHeader title="Notes" />
          <Card>
            <p className="text-[14px] leading-[21px] text-[var(--c-ink-muted)]">{client.notes}</p>
          </Card>
        </>
      )}

      <SectionHeader title="History" />
      {history.length === 0 ? (
        <EmptyState title="No jobs yet" body="Nothing booked through the app." />
      ) : (
        <Card padded={false}>
          <div className="px-[var(--space-xl)]">
            {history.map((booking) => (
              <ListRow
                key={booking.id}
                label={booking.serviceIds.map((id) => serviceById(id)?.name).join(' + ')}
                detail={dateFormat.format(new Date(booking.scheduledAt))}
                to={`/admin/jobs/${booking.id}`}
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

      <div className="mt-[var(--space-2xl)] flex gap-[var(--space-md)]">
        <Button variant="secondary">Text</Button>
        <Button variant="secondary">Book a job</Button>
      </div>
    </Screen>
  );
}
