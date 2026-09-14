import { create } from 'zustand';
import { platform } from '../lib/platform';
import type { Role } from '../core/types';

/**
 * Who the shell thinks you are.
 *
 * Auth is not wired up yet, so the role is chosen locally and persisted
 * through the platform storage adapter. When Supabase auth lands, `role` is
 * resolved from the profile at sign-in and this store keeps its shape — only
 * `setRole` goes away, replaced by the session listener. Every screen reads
 * the role from here rather than from auth directly, so that swap touches one
 * file.
 */
interface SessionState {
  role: Role;
  setRole: (role: Role) => void;
  /** Shows the role switcher. Off once real auth exists. */
  devMode: boolean;
  /** False until the stored role has been read back. */
  hydrated: boolean;
}

const STORAGE_KEY = 'beezy.devRole';

const isRole = (value: string | null): value is Role =>
  value === 'customer' || value === 'tech' || value === 'admin' || value === 'owner';

export const useSession = create<SessionState>((set) => ({
  role: 'customer',
  devMode: true,
  hydrated: false,
  setRole: (role) => {
    void platform.storage.set(STORAGE_KEY, role);
    set({ role });
  },
}));

// Storage is async through the adapter (it has to be, to survive a native
// implementation), so the store starts on the default and corrects itself.
// The shell renders the customer tabs for one frame at worst.
void platform.storage.get(STORAGE_KEY).then((stored) => {
  useSession.setState({ role: isRole(stored) ? stored : 'customer', hydrated: true });
});

export const isStaff = (role: Role) => role === 'admin' || role === 'owner';
