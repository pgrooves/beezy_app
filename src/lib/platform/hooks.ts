import { useEffect } from 'react';

/**
 * React bindings for host-specific behaviour.
 *
 * Lives inside the platform boundary because it touches browser globals. On
 * React Native `useDismiss` maps to BackHandler rather than a key listener,
 * and no caller changes.
 */

/**
 * Runs `onDismiss` when the user asks to back out of a transient surface —
 * Escape on the web, the hardware/gesture back on Android.
 */
export function useDismiss(active: boolean, onDismiss: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, onDismiss]);
}

/**
 * Prevents the page behind a modal surface from scrolling.
 *
 * iOS Safari ignores `overflow: hidden` on body in some cases, so the scroll
 * position is pinned explicitly and restored on close.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { body } = document;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}

/**
 * Scrolls to the top whenever `key` changes.
 *
 * A pushed screen should start at the top rather than inheriting wherever the
 * previous one was left. React Native's navigator does this itself, so the
 * native implementation is a no-op.
 */
export function useScrollToTop(key: string) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [key]);
}
