import type { ReactNode } from "react";
import type { SeatLayout } from "@/features/game-room/variants/core/types";
import { gridSpanStyle } from "@/features/game-room/lib/gridSpan";

type RingCenterProps = {
  seatLayout: SeatLayout;
  hostVideo: ReactNode;
  controls: ReactNode;
};

/**
 * The middle of the participant ring — host video plus host controls.
 *
 * Two shapes, both driven by `ruleset.seatLayout` and never by a `gameType`
 * check: Japanese MERGES them into one 2×2 panel (controls on top, host video
 * under, via `flex-col-reverse`), Sports SPLITS them into two adjacent cells.
 *
 * Both hand the controls cell over bare — no padding, no centring. The host
 * panel is a size container whose padding is part of its own type scale, so it
 * must own the whole box; anything else opts back into `CENTER_PANEL_STACK_CLASS`.
 */
export default function RingCenter({
  seatLayout,
  hostVideo,
  controls,
}: RingCenterProps) {
  const { hostPanel, controlsPanel } = seatLayout;

  if (hostPanel && controlsPanel) {
    return (
      <>
        <div
          className="center-panel flex items-center justify-center overflow-hidden rounded-2xl border"
          style={gridSpanStyle(hostPanel)}
        >
          {hostVideo}
        </div>
        <div
          className="center-panel overflow-hidden rounded-2xl border"
          style={gridSpanStyle(controlsPanel)}
        >
          {controls}
        </div>
      </>
    );
  }

  return (
    <div
      className="center-panel flex flex-col-reverse overflow-hidden rounded-2xl border"
      style={gridSpanStyle(seatLayout.center)}
    >
      <div className="flex h-1/2 items-center justify-center border-b border-white/10">
        {hostVideo}
      </div>
      <div className="h-1/2 min-h-0">{controls}</div>
    </div>
  );
}
