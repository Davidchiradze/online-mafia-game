import { useEffect, useRef } from "react";

/**
 * Calls `onReachEnd` when the returned sentinel element scrolls into view.
 * Place the sentinel at the bottom of a list to drive infinite scroll.
 *
 * `enabled` should be the "can load more" flag; `onReachEnd` should be a stable
 * (useCallback'd) reference so the observer isn't re-created every render.
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>(
  onReachEnd: () => void,
  enabled: boolean,
) {
  const sentinelRef = useRef<T | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onReachEnd();
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, onReachEnd]);

  return sentinelRef;
}
