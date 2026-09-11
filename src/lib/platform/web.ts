/**
 * Web implementations of the platform contracts.
 *
 * This is the only place in the app allowed to touch browser globals.
 * Adapters that Phase 1 does not need yet throw NotImplemented rather than
 * returning a fake success, so a premature call fails loudly in development.
 */
import type {
  AppShellAdapter,
  AppearanceAdapter,
  CameraAdapter,
  ColourScheme,
  DisplayMode,
  GeolocationAdapter,
  HapticsAdapter,
  NotificationAdapter,
  Platform,
  PermissionState,
  ShareAdapter,
  StorageAdapter,
} from './types';
import { themeColour } from '../../theme/tokens';

class NotImplemented extends Error {
  constructor(what: string, phase: string) {
    super(`${what} is not implemented yet (arrives in ${phase})`);
    this.name = 'NotImplemented';
  }
}

/**
 * localStorage throws in private mode and when site data is blocked, and can
 * come back empty after eviction. Every access is guarded; callers get null.
 */
const storage: StorageAdapter = {
  async get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* quota, private mode, blocked site data — non-fatal by design */
    }
  },
  async remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* see above */
    }
  },
};

/** Captured from beforeinstallprompt on browsers that fire it (not Safari). */
let deferredInstallPrompt: (Event & { prompt(): Promise<void> }) | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e as Event & { prompt(): Promise<void> };
  });
}

const standaloneQuery = '(display-mode: standalone)';

const appShell: AppShellAdapter = {
  displayMode(): DisplayMode {
    if (window.matchMedia(standaloneQuery).matches) return 'standalone';
    // iOS Safari predates the display-mode query and uses this instead.
    if ((window.navigator as { standalone?: boolean }).standalone) return 'standalone';
    return 'browser';
  },
  canPromptInstall() {
    return deferredInstallPrompt !== null;
  },
  async promptInstall() {
    if (!deferredInstallPrompt) return false;
    await deferredInstallPrompt.prompt();
    deferredInstallPrompt = null;
    return true;
  },
  isIOS() {
    const ua = window.navigator.userAgent;
    // iPadOS 13+ reports as Macintosh, so check for touch to catch it.
    const iPadOS = ua.includes('Macintosh') && window.navigator.maxTouchPoints > 1;
    return /iPad|iPhone|iPod/.test(ua) || iPadOS;
  },
  onDisplayModeChange(fn) {
    const mq = window.matchMedia(standaloneQuery);
    const handler = () => fn(mq.matches ? 'standalone' : 'browser');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  },
};

const darkQuery = '(prefers-color-scheme: dark)';

const appearance: AppearanceAdapter = {
  systemScheme(): ColourScheme {
    return window.matchMedia(darkQuery).matches ? 'dark' : 'light';
  },
  onSystemSchemeChange(fn) {
    const mq = window.matchMedia(darkQuery);
    const handler = () => fn(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  },
  prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
  prefersReducedTransparency() {
    return window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
  },
  apply(scheme) {
    const root = document.documentElement;
    if (scheme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', scheme);
    }
    const resolved = scheme === 'system' ? appearance.systemScheme() : scheme;
    // Keep the iOS status bar and Android chrome in step with the page.
    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((meta) => {
        const forScheme = meta.media?.includes('dark') ? 'dark' : 'light';
        if (!meta.media) meta.content = themeColour[resolved];
        else meta.content = themeColour[forScheme];
      });
  },
};

const camera: CameraAdapter = {
  async capture() {
    throw new NotImplemented('camera.capture', 'Phase 3');
  },
  async pickFromLibrary() {
    throw new NotImplemented('camera.pickFromLibrary', 'Phase 3');
  },
  async permission(): Promise<PermissionState> {
    if (!navigator.mediaDevices) return 'unsupported';
    try {
      const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return status.state as PermissionState;
    } catch {
      return 'prompt';
    }
  },
};

const geolocation: GeolocationAdapter = {
  async current() {
    throw new NotImplemented('geolocation.current', 'Phase 3');
  },
  async permission(): Promise<PermissionState> {
    if (!navigator.geolocation) return 'unsupported';
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      return status.state as PermissionState;
    } catch {
      return 'prompt';
    }
  },
};

const notifications: NotificationAdapter = {
  isSupported() {
    // On iOS this is only true once installed to the Home Screen.
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  },
  async permission(): Promise<PermissionState> {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission as PermissionState;
  },
  async request(): Promise<PermissionState> {
    throw new NotImplemented('notifications.request', 'Phase 8');
  },
};

/**
 * iOS Safari exposes no Vibration API, so haptics are a no-op on iPhone until
 * the native port. Calls stay in the code so the native build lights them up.
 */
const haptics: HapticsAdapter = {
  success: () => navigator.vibrate?.([12, 40, 18]),
  warning: () => navigator.vibrate?.([16, 60, 16]),
  error: () => navigator.vibrate?.([24, 60, 24, 60, 24]),
  selection: () => navigator.vibrate?.(8),
};

const share: ShareAdapter = {
  isSupported() {
    return typeof navigator.share === 'function';
  },
  async share(data) {
    if (!navigator.share) return false;
    try {
      await navigator.share(data);
      return true;
    } catch {
      // AbortError when the user dismisses the sheet — not a failure.
      return false;
    }
  },
};

export const webPlatform: Platform = {
  storage,
  appShell,
  appearance,
  camera,
  geolocation,
  notifications,
  haptics,
  share,
};
