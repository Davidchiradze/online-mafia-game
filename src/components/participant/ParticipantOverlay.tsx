"use client";

import {
  ParticipantTile,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { VisibilityState } from "@/lib/game/visibility";
import ParticipantCover from "@/components/video/ParticipantCover";

interface ParticipantOverlayProps {
  visibilityState: VisibilityState;
  coverMessage?: string;
  trackRef: TrackReferenceOrPlaceholder | undefined;
}

/**
 * ParticipantOverlay - Handles the video/cover layer display logic.
 * Shows participant video, cover states (dead, disconnected, dimmed), etc.
 */
export default function ParticipantOverlay({
  visibilityState,
  coverMessage,
  trackRef,
}: ParticipantOverlayProps) {
  if (visibilityState === VisibilityState.DEAD) {
    return <ParticipantCover isDead={true} />;
  }

  if (visibilityState === VisibilityState.COVERED) {
    return <ParticipantCover message={coverMessage} />;
  }

  if (!trackRef) {
    return <ParticipantCover isDisconnected={true} />;
  }

  return (
    <div className="relative w-full h-full">
      <ParticipantTile
        className="lk-hide-metadata"
        trackRef={trackRef}
        style={{ height: "100%" }}
      />
      {visibilityState === VisibilityState.DIMMED && (
        <div className="absolute inset-0 z-[5] pointer-events-none">
          <div className="absolute inset-0 backdrop-blur-sm bg-slate-900/50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl md:text-5xl opacity-80 animate-pulse">
              💤
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
