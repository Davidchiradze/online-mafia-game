"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  resolveHostPanelLayout,
  type HostPanelLayout,
} from "@/features/game-room/lib/hostPanel";

/**
 * Measures the host panel and reports which composition fits.
 *
 * The panel is sized by the ring cell it lands in, which depends on the
 * variant's grid, the viewport and the orientation all at once — so the band
 * is resolved from the PANEL's own box, never from a page breakpoint. The
 * per-element type scale is pure CSS (`container-type: size` plus `cqh`/`cqw`
 * clamps in game.css); only the composition switch needs JS, because the three
 * compositions are different element trees, not different font sizes.
 *
 * State only changes when the band changes, so a drag-resize re-renders three
 * times at most, not once per frame.
 *
 * Pass `fixedLayout` to pin a composition — the expanded sheet is always the
 * full panel regardless of the bar that opened it.
 */
export function useHostPanelLayout(fixedLayout?: HostPanelLayout): {
  containerRef: (node: HTMLElement | null) => void;
  layout: HostPanelLayout;
} {
  const [measured, setMeasured] = useState<HostPanelLayout>("panel");
  const observerRef = useRef<ResizeObserver | null>(null);

  const containerRef = useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!node || fixedLayout) return;

      const observer = new ResizeObserver((entries) => {
        const box = entries[0]?.contentRect;
        if (!box) return;
        setMeasured((current) => {
          const next = resolveHostPanelLayout({
            width: box.width,
            height: box.height,
          });
          return next === current ? current : next;
        });
      });
      observer.observe(node);
      observerRef.current = observer;
    },
    [fixedLayout],
  );

  useEffect(
    () => () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    },
    [],
  );

  return { containerRef, layout: fixedLayout ?? measured };
}
