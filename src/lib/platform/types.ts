/**
 * Platform capability contracts.
 *
 * Every browser capability the app uses is declared here and implemented once,
 * in this directory. Nothing above /lib/platform may touch `window`,
 * `document`, `navigator`, or `localStorage` — eslint.config.js enforces that,
 * and CI fails on a violation.
 *
 * At port time each adapter gains a native implementation and nothing above it
 * changes. That is the entire portability strategy, so keep these interfaces
 * describing *intent* ("capture a vehicle photo"), never web mechanics
 * ("open a file input").
 */

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

/** Key-value persistence. Small values only; photos go to the storage bucket. */
export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export type DisplayMode = 'browser' | 'standalone';

export interface AppShellAdapter {
  /** Standalone means installed to the Home Screen (or a native build). */
  displayMode(): DisplayMode;
  /** iOS Safari has no beforeinstallprompt, so install may be manual-only. */
  canPromptInstall(): boolean;
  /** Resolves false when no prompt was available or the user dismissed it. */
  promptInstall(): Promise<boolean>;
  /** True on iOS/iPadOS, where the install flow is Share -> Add to Home Screen. */
  isIOS(): boolean;
  /** Subscribe to display-mode changes; returns an unsubscribe function. */
  onDisplayModeChange(fn: (mode: DisplayMode) => void): () => void;
}

export type ColourScheme = 'light' | 'dark';

export interface AppearanceAdapter {
  systemScheme(): ColourScheme;
  onSystemSchemeChange(fn: (scheme: ColourScheme) => void): () => void;
  prefersReducedMotion(): boolean;
  /** iOS "Reduce Transparency" — the Liquid Glass nav must degrade to solid. */
  prefersReducedTransparency(): boolean;
  /** Applies the scheme to the host UI (status bar, theme-color, root attr). */
  apply(scheme: ColourScheme | 'system'): void;
}

export type PhotoPurpose = 'vehicle-condition' | 'job-before' | 'job-after' | 'damage';

export interface CapturedPhoto {
  blob: Blob;
  width: number;
  height: number;
  capturedAt: string;
  /** Absent when the platform or the user withheld location. */
  coords?: { latitude: number; longitude: number; accuracy: number };
}

export interface CameraAdapter {
  /**
   * Purpose is required because the permission prompt copy is guideline
   * 5.1.1(i) surface — see docs/COMPLIANCE.md.
   */
  capture(purpose: PhotoPurpose): Promise<CapturedPhoto | null>;
  pickFromLibrary(purpose: PhotoPurpose): Promise<CapturedPhoto[]>;
  permission(): Promise<PermissionState>;
}

export interface GeolocationAdapter {
  current(): Promise<{ latitude: number; longitude: number; accuracy: number } | null>;
  permission(): Promise<PermissionState>;
}

export interface NotificationAdapter {
  permission(): Promise<PermissionState>;
  request(): Promise<PermissionState>;
  /**
   * Web push on iOS only works once installed to the Home Screen, so callers
   * must handle false and fall back to email/SMS reminders.
   */
  isSupported(): boolean;
}

export interface HapticsAdapter {
  /** Booking confirmed, payment succeeded, job status advanced. */
  success(): void;
  warning(): void;
  error(): void;
  /** Light tick for selection changes. */
  selection(): void;
}

export interface ShareAdapter {
  isSupported(): boolean;
  share(data: { title?: string; text?: string; url?: string; files?: File[] }): Promise<boolean>;
}

export interface Platform {
  storage: StorageAdapter;
  appShell: AppShellAdapter;
  appearance: AppearanceAdapter;
  camera: CameraAdapter;
  geolocation: GeolocationAdapter;
  notifications: NotificationAdapter;
  haptics: HapticsAdapter;
  share: ShareAdapter;
}
