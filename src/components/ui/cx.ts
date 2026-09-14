/**
 * Conditional class names.
 *
 * Its own module so the component file stays components-only — mixing helpers
 * into it breaks React Fast Refresh during development.
 */
export const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(' ');
