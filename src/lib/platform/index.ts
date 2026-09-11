/**
 * The app's only entry point to device capability.
 *
 * Import `platform` from here, never from ./web — swapping in a native
 * implementation at port time should be a one-line change in this file.
 */
import { webPlatform } from './web';
import type { Platform } from './types';

export const platform: Platform = webPlatform;

export type * from './types';
