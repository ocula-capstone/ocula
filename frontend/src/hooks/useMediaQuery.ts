import { useCallback, useSyncExternalStore } from 'react';

// True while the screen matches a CSS media query, e.g. '(min-width: 768px)'.
export function useMediaQuery(query: string) {
  // Stable per query, so React keeps one listener instead of re-subscribing on every render.
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
