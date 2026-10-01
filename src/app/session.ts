import { create } from 'zustand';
import type { AuthError, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { platform } from '../lib/platform';
import {
  PROFILE_COLUMNS,
  normaliseEmail,
  profileFromRow,
  profilePatchToRow,
  type ProfileRow,
} from '../core/profile';
import type { Profile, ProfilePatch, Role } from '../core/types';

/**
 * Who the shell thinks you are.
 *
 * Every screen reads identity and role from here rather than from Supabase
 * directly, so the auth provider is one file's concern. Role comes from
 * `public.profiles`, never from anything the client can set — 0004 removed
 * the client's ability to write it.
 *
 * Signed out is a real, browsable state: the gallery, menu, About and FAQ
 * stay open (guideline 5.1.1(iv)), and the guards in App.tsx send anything
 * account-bound to /sign-in.
 */
export type AuthStatus =
  /** Reading a stored session back. Guards render nothing rather than bounce. */
  | 'loading'
  | 'signedOut'
  | 'signedIn'
  /** This build has no Supabase configuration; see src/lib/supabase.ts. */
  | 'unavailable';

/** A user-facing message, or null on success. */
export type ActionResult = { error: string | null };

interface SessionState {
  status: AuthStatus;
  /** Null while loading, signed out, or if the profile could not be read. */
  profile: Profile | null;
  /** The shell to render. Signed out browses as a customer. */
  role: Role;
  /** False until the stored session has been read back. */
  hydrated: boolean;

  sendCode: (email: string) => Promise<ActionResult>;
  verifyCode: (email: string, code: string) => Promise<ActionResult>;
  signOut: () => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<ActionResult>;
  deleteAccount: () => Promise<ActionResult>;
}

/**
 * Last-known profile, so an installed app opened with no signal still knows
 * whose it is and which shell to draw. Refreshed on every sign-in and launch.
 * Holds only what the signed-in person can already see about themselves.
 */
const PROFILE_CACHE_KEY = 'beezy.profile';

const SIGNED_OUT = { status: 'signedOut', profile: null, role: 'customer', hydrated: true } as const;

export const useSession = create<SessionState>((set, get) => ({
  status: supabase ? 'loading' : 'unavailable',
  profile: null,
  role: 'customer',
  hydrated: !supabase,

  async sendCode(email) {
    if (!supabase) return { error: UNAVAILABLE };
    const { error } = await supabase.auth.signInWithOtp({
      email: normaliseEmail(email),
      // New addresses are created here, and the allowlist trigger in 0004
      // refuses any that were not invited — before an email is sent.
      options: { shouldCreateUser: true },
    });
    return { error: error ? describeSendError(error) : null };
  },

  async verifyCode(email, code) {
    if (!supabase) return { error: UNAVAILABLE };
    const { data, error } = await supabase.auth.verifyOtp({
      email: normaliseEmail(email),
      token: code.trim(),
      type: 'email',
    });
    if (error || !data.session) return { error: describeVerifyError(error) };
    // Resolve the role before the caller navigates, so the first screen after
    // sign-in is already the right shell.
    await loadProfile(data.session);
    return { error: null };
  },

  async signOut() {
    await platform.storage.remove(PROFILE_CACHE_KEY);
    set(SIGNED_OUT);
    // Local scope: sign this device out. The listener below sees SIGNED_OUT
    // too; setting state first means the UI never waits on the network.
    await supabase?.auth.signOut({ scope: 'local' });
  },

  async updateProfile(patch) {
    const current = get().profile;
    if (!supabase || !current) return { error: UNAVAILABLE };
    const { data, error } = await supabase
      .from('profiles')
      .update(profilePatchToRow(patch))
      .eq('id', current.id)
      .select(PROFILE_COLUMNS)
      .single<ProfileRow>();
    if (error || !data) return { error: 'That didn’t save. Check your connection and try again.' };
    applyProfile(profileFromRow(data));
    return { error: null };
  },

  async deleteAccount() {
    if (!supabase || !get().profile) return { error: UNAVAILABLE };
    // The client cannot delete an auth user, by design. The edge function
    // verifies the caller's own token and deletes exactly that user with the
    // service role; the database cascades the rest (DECISIONS.md#0022).
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) {
      const message = await functionErrorMessage(error);
      return { error: message ?? 'Your account wasn’t deleted. Check your connection and try again.' };
    }
    await get().signOut();
    return { error: null };
  },
}));

export const isStaff = (role: Role) => role === 'admin' || role === 'owner';

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

function applyProfile(profile: Profile) {
  useSession.setState({ status: 'signedIn', profile, role: profile.role, hydrated: true });
  void platform.storage.set(PROFILE_CACHE_KEY, JSON.stringify(profile));
}

async function readCachedProfile(userId: string): Promise<Profile | null> {
  const raw = await platform.storage.get(PROFILE_CACHE_KEY);
  if (!raw) return null;
  try {
    const cached = JSON.parse(raw) as Profile;
    // A cache from a different account on this device is not this person's.
    return cached.id === userId ? cached : null;
  } catch {
    return null;
  }
}

async function loadProfile(session: Session) {
  if (!supabase) return;
  const userId = session.user.id;

  // Paint from the cache first, so a staff member opening the app with no
  // signal lands in their own shell rather than the customer one.
  const cached = await readCachedProfile(userId);
  if (cached && useSession.getState().profile?.id !== userId) applyProfile(cached);

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle<ProfileRow>();

  if (data) {
    applyProfile(profileFromRow(data));
  } else if (!error) {
    // Signed in, but no profile row: the account was deleted elsewhere, or
    // the signup trigger failed. Nothing account-bound can work, so say
    // signed out rather than render a shell with nobody in it.
    await useSession.getState().signOut();
  } else if (!cached) {
    // Offline on first launch after sign-in. Signed in as a customer is the
    // safe reading; the next launch with signal corrects it.
    useSession.setState({ status: 'signedIn', profile: null, role: 'customer', hydrated: true });
  }
}

if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (!session) {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
        void platform.storage.remove(PROFILE_CACHE_KEY);
        useSession.setState(SIGNED_OUT);
      }
      return;
    }
    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
      // supabase-js holds a lock while this callback runs; awaiting another
      // Supabase call inside it deadlocks. Defer to the next task.
      setTimeout(() => void loadProfile(session), 0);
    }
  });
}

// ---------------------------------------------------------------------------
// Error copy
// ---------------------------------------------------------------------------

const UNAVAILABLE = 'Sign-in isn’t available on this build.';

/**
 * The allowlist trigger aborts the signup inside Postgres, which GoTrue
 * reports only as a generic database error. That is the one way a correctly
 * typed, never-seen address fails here, so it is safe to read as "not invited".
 */
export function describeSendError(error: Pick<AuthError, 'message' | 'status' | 'code'>): string {
  const message = error.message.toLowerCase();
  if (message.includes('database error saving new user') || message.includes('signups not allowed')) {
    return 'Beezy’s app is invite-only while it’s in beta. Ask Beezy to add this email, then try again.';
  }
  // Supabase's built-in mailer only delivers to the project's own team until
  // custom SMTP is configured (DECISIONS.md#0021). Not the tester's fault, so
  // do not tell them their address is wrong.
  if (error.code === 'email_address_not_authorized' || message.includes('not authorized')) {
    return 'Beezy can’t send sign-in emails to this address yet. Let Beezy know and they’ll sort it.';
  }
  if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
    return 'Too many codes requested. Wait a minute, then try again.';
  }
  if (error.code === 'email_address_invalid' || message.includes('invalid')) {
    return 'That email address doesn’t look right.';
  }
  return 'We couldn’t send a code. Check your connection and try again.';
}

export function describeVerifyError(
  error: Pick<AuthError, 'message' | 'status' | 'code'> | null,
): string {
  if (error?.status === 429) return 'Too many attempts. Wait a minute, then try again.';
  if (error && (error.code === 'otp_expired' || /expired|invalid/i.test(error.message))) {
    return 'That code didn’t match, or it has expired. Check it, or send a new one.';
  }
  return 'We couldn’t check that code. Check your connection and try again.';
}

/** Edge function errors carry the response; ours put a message in its body. */
async function functionErrorMessage(error: unknown): Promise<string | null> {
  const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
  if (!context?.json) return null;
  try {
    const body = (await context.json()) as { error?: unknown };
    return typeof body.error === 'string' ? body.error : null;
  } catch {
    return null;
  }
}
