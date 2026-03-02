"use client";

import {
  ParticipantTile,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { VisibilityState } from "@/lib/game/visibility";
import ParticipantCover from "@/components/video/ParticipantCover";

interface ParticipantOverlayProps {
  visibilityState: VisibilityState;
  trackRef: TrackReferenceOrPlaceholder | undefined;
}

/**
 * ParticipantOverlay — renders the correct tile content based solely
 * on VisibilityState. Every non-VISIBLE state is delegated to ParticipantCover.
 */
export default function ParticipantOverlay({
  visibilityState,
  trackRef,
}: ParticipantOverlayProps) {
  if (visibilityState === VisibilityState.DEAD) {
    return <ParticipantCover state="dead" />;
  }

  if (visibilityState === VisibilityState.COVERED) {
    return <ParticipantCover state="sleeping" />;
  }

  if (visibilityState === VisibilityState.DISCONNECTED || !trackRef) {
    return <ParticipantCover state="disconnected" />;
  }

  return (
    <div className="relative w-full h-full">
      <ParticipantTile
        className="lk-hide-metadata"
        trackRef={trackRef}
        style={{ height: "100%" }}
      />
      {visibilityState === VisibilityState.DIMMED && (
        <ParticipantCover state="dimmed" />
      )}
    </div>
  );
}
