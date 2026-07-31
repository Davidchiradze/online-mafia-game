"use client";

import {
  ParticipantTile,
  TrackReferenceOrPlaceholder,
  isTrackReference,
} from "@livekit/components-react";
import { VisibilityState } from "@/shared/lib/game/visibility";
import ParticipantCover from "@/components/video/ParticipantCover";
import CameraOffCover from "./playerStates/CameraOffCover";

interface ParticipantOverlayProps {
  visibilityState: VisibilityState;
  trackRef: TrackReferenceOrPlaceholder | undefined;
  /** Player's profile picture URL — shown when their camera is off. */
  avatar?: string;
  /** Player's display name — used for the camera-off avatar fallback. */
  displayName?: string;
}

/**
 * ParticipantOverlay — renders the correct tile content based solely
 * on VisibilityState. Every non-VISIBLE state is delegated to ParticipantCover.
 */
export default function ParticipantOverlay({
  visibilityState,
  trackRef,
  avatar,
  displayName,
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

  // Connected participant with camera turned off: a placeholder (no publication)
  // or a published-but-muted camera track. Show their profile picture instead
  // of LiveKit's generic silhouette placeholder.
  const cameraOff =
    !isTrackReference(trackRef) || Boolean(trackRef.publication?.isMuted);

  const videoLayer = cameraOff ? (
    <CameraOffCover avatar={avatar} name={displayName} />
  ) : (
    <ParticipantTile
      className="lk-hide-metadata"
      trackRef={trackRef}
      style={{ height: "100%" }}
    />
  );

  if (visibilityState === VisibilityState.MASKED) {
    return (
      <div className="relative w-full h-full">
        {videoLayer}
        <ParticipantCover state="masked" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {videoLayer}
      {visibilityState === VisibilityState.DIMMED && (
        <ParticipantCover state="dimmed" />
      )}
    </div>
  );
}
