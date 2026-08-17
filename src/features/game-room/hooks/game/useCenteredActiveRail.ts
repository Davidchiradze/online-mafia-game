"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Keeps the collapsed rail's active item scrolled to the middle.
 *
 * The rail (`.host-panel__line-run`) is the one place the panel scrolls
 * sideways rather than shrinking, so on a phone the seat on the clock routinely
 * sits off the right edge — the host advances to the next candidate and the
 * thing they advanced TO is the thing they cannot see. Centring is the fix, not
 * a wider rail: there is no width left to give it.
 *
 * `cursor` is what gates the scroll. It changes only when the active item
 * changes (see `hostPanelRailCursor`), so a host who swipes the rail themselves
 * keeps their position, and a vote count ticking up does not yank it sideways
 * mid-window.
 *
 * Deliberately NOT `scrollIntoView`: that walks every scrollable ancestor, and
 * the rail sits inside the data zone, inside a clipped ring cell, inside the
 * page. Asking it to centre one 40px pill has scrolled the whole game room
 * before. Scrolling the rail's own `scrollLeft` touches nothing else.
 */
export function useCenteredActiveRail(
  cursor: string | null,
): RefObject<HTMLDivElement | null> {
  const railRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || cursor === null) return;

    const active = rail.querySelector<HTMLElement>('[data-active="true"]');
    // The run fits outright — the common case, and there is nothing to centre.
    if (!active || rail.scrollWidth <= rail.clientWidth) return;

    // Measured from rects rather than `offsetLeft`: the rail is not positioned,
    // so its children's offset parent is some ancestor further up and their
    // `offsetLeft` is not in the rail's coordinate space.
    const railBox = rail.getBoundingClientRect();
    const activeBox = active.getBoundingClientRect();
    const delta =
      activeBox.left +
      activeBox.width / 2 -
      (railBox.left + railBox.width / 2);
    // Sub-pixel drift is not worth an animation. The browser clamps the target
    // to the scrollable range, so an edge item lands flush instead of centred.
    if (Math.abs(delta) < 1) return;

    rail.scrollTo({
      left: rail.scrollLeft + delta,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [cursor]);

  return railRef;
}
