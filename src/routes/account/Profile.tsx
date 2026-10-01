import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Field,
  FormMessage,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
  inputClass,
} from '../../components/ui';
import { cx } from '../../components/ui/cx';
import { useSession } from '../../app/session';
import { assetUrl } from '../../lib/assets';
import { platform } from '../../lib/platform';
import type { Profile } from '../../core/types';

/**
 * Your details, signing out, and deleting the account.
 *
 * Deletion is two taps from the tab bar (••• → Profile & account → Delete),
 * which is what both stores require: in the app, without emailing anyone.
 */
export default function ProfileScreen() {
  const profile = useSession((s) => s.profile);

  return (
    <Screen>
      <ScreenHeader eyebrow="Settings" title="Profile" />
      {profile ? (
        // Keyed so the form resets if the profile is replaced underneath it.
        <DetailsForm key={profile.id} profile={profile} />
      ) : (
        <p className="mt-[var(--space-xl)] text-[14px] leading-[21px] text-[var(--c-ink-muted)]">
          Your details will appear here once you&rsquo;re back online.
        </p>
      )}
      <AccountActions />
    </Screen>
  );
}

function DetailsForm({ profile }: { profile: Profile }) {
  const updateProfile = useSession((s) => s.updateProfile);
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [galleryConsent, setGalleryConsent] = useState(profile.galleryConsent);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null);

  const dirty =
    fullName.trim() !== profile.fullName ||
    phone.trim() !== profile.phone ||
    galleryConsent !== profile.galleryConsent;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const { error } = await updateProfile({ fullName, phone, galleryConsent });
    setBusy(false);
    if (error) {
      setMessage({ tone: 'danger', text: error });
      platform.haptics.error();
    } else {
      setMessage({ tone: 'success', text: 'Saved.' });
      platform.haptics.success();
    }
  };

  return (
    <form onSubmit={save} noValidate className="mt-[var(--space-lg)] space-y-[var(--space-lg)]">
      <Field label="Name">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
          className={inputClass}
        />
      </Field>
      <Field label="Mobile" hint="For arrival texts">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          inputMode="tel"
          placeholder="(504) 555-0142"
          className={cx(inputClass, 'tabular')}
        />
      </Field>
      <Field label="Email" hint="Used to sign in">
        <p className={cx(inputClass, 'text-[var(--c-ink-muted)]')}>{profile.email}</p>
      </Field>
      <label className="flex items-center justify-between gap-[var(--space-lg)] rounded-[var(--radius-card)] border border-[var(--c-hairline)] bg-[var(--c-surface)] p-[var(--space-lg)]">
        <span className="min-w-0">
          <span className="block text-[15px] leading-[23px]">Feature my car in the gallery</span>
          <span className="block text-[13px] leading-[19px] text-[var(--c-ink-muted)]">
            Before-and-after photos of your car, never your name or address. Off unless you
            turn it on.
          </span>
        </span>
        <input
          type="checkbox"
          checked={galleryConsent}
          onChange={(e) => setGalleryConsent(e.target.checked)}
          className="h-6 w-6 shrink-0 accent-[var(--c-accent-text)]"
        />
      </label>
      {message && <FormMessage tone={message.tone}>{message.text}</FormMessage>}
      <Button type="submit" full disabled={!dirty || busy}>
        {busy ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}

function AccountActions() {
  const signOut = useSession((s) => s.signOut);
  const deleteAccount = useSession((s) => s.deleteAccount);
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rowClass =
    'flex w-full items-center gap-[var(--space-lg)] border-b border-[var(--c-hairline)] py-[var(--space-lg)] text-left last:border-b-0';

  return (
    <>
      <SectionHeader title="Account" />
      <Card padded={false}>
        <div className="px-[var(--space-xl)]">
          <a href={assetUrl('privacy.html')} target="_blank" rel="noopener" className={rowClass}>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] leading-[23px]">Privacy policy</span>
              <span className="block text-[13px] leading-[19px] text-[var(--c-ink-subtle)]">
                Opens in your browser
              </span>
            </span>
            <span aria-hidden className="text-[var(--c-ink-subtle)]">
              ›
            </span>
          </a>
          <ListRow
            label="Sign out"
            onClick={async () => {
              await signOut();
              navigate('/', { replace: true });
            }}
          />
          <ListRow
            label="Delete account"
            detail="Removes your vehicles, photos and details"
            danger
            onClick={() => {
              setConfirming(true);
              setError(null);
              platform.haptics.warning();
            }}
          />
        </div>
      </Card>

      {confirming && (
        <section
          aria-labelledby="delete-heading"
          className="mt-[var(--space-lg)] rounded-[var(--radius-card)] border border-[var(--c-danger)] p-[var(--space-xl)]"
        >
          <h2 id="delete-heading" className="font-display text-[20px] leading-[26px]">
            Delete your account?
          </h2>
          <p className="mt-[var(--space-md)] text-[14px] leading-[21px] text-[var(--c-ink-muted)]">
            This removes your profile, your garage and your photos straight away, and signs you
            out. It can&rsquo;t be undone.
          </p>
          <p className="mt-[var(--space-md)] text-[14px] leading-[21px] text-[var(--c-ink-muted)]">
            Receipts for work Beezy has already done are kept, with your name and contact details
            removed, because the business must keep tax records for seven years.
          </p>
          {error && <FormMessage>{error}</FormMessage>}
          <div className="mt-[var(--space-xl)] space-y-[var(--space-md)]">
            <Button
              variant="danger"
              full
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                const result = await deleteAccount();
                setBusy(false);
                if (result.error) {
                  setError(result.error);
                  platform.haptics.error();
                  return;
                }
                platform.haptics.success();
                navigate('/', { replace: true });
              }}
            >
              {busy ? 'Deleting…' : 'Delete my account'}
            </Button>
            <Button variant="secondary" full disabled={busy} onClick={() => setConfirming(false)}>
              Keep my account
            </Button>
          </div>
        </section>
      )}
    </>
  );
}
