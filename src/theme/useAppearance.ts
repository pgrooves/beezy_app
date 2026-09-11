import { useCallback, useEffect, useState } from 'react';
import { platform } from '../lib/platform';
import type { ColourScheme } from '../lib/platform';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'beezy.theme';

function isPreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * Theme preference, persisted and applied to the host UI.
 *
 * All device access goes through the platform adapter, so this hook ports to
 * React Native by swapping the adapter and nothing else.
 */
export function useAppearance() {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [systemScheme, setSystemScheme] = useState<ColourScheme>(() =>
    platform.appearance.systemScheme(),
  );
  // Until storage resolves we render on the system scheme, which is the
  // correct guess often enough to avoid a visible flip.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    platform.storage.get(STORAGE_KEY).then((stored) => {
      if (!active) return;
      if (isPreference(stored)) setPreferenceState(stored);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => platform.appearance.onSystemSchemeChange(setSystemScheme), []);

  useEffect(() => {
    platform.appearance.apply(preference);
  }, [preference, systemScheme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void platform.storage.set(STORAGE_KEY, next);
    platform.haptics.selection();
  }, []);

  const resolved: ColourScheme = preference === 'system' ? systemScheme : preference;

  return { preference, setPreference, resolved, loaded };
}
