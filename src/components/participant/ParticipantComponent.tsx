"use client";

import {
  ParticipantTile,
  TrackReferenceOrPlaceholder,
  TrackToggle,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { MicOffIcon, MicOnIcon } from "@/assets/icons";

export default function ParticipantComponent({
  trackRef,
  playerIndex,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  playerIndex: number | "host";
}) {
  const participant = (trackRef as any)?.participant;
  const isLocal = Boolean(participant?.isLocal);
  const isMicEnabled = Boolean(participant?.isMicrophoneEnabled);
  const displayName: string | undefined =
    participant?.name || participant?.identity;

  return (
    <div className="relative w-full h-full flex flex-col items-stretch justify-stretch text-sm text-gray-300">
      <ParticipantTile
        className="lk-hide-metadata"
        trackRef={trackRef}
        style={{ height: "100%" }}
      />

      {isLocal ? (
        <div className="absolute left-2 top-2 z-10">
          <TrackToggle source={Track.Source.Microphone} showIcon={true} />
        </div>
      ) : (
        <div className="absolute left-2 top-2 z-10 rounded-md bg-black/60 px-2 py-1 text-white">
          {isMicEnabled ? <MicOnIcon /> : <MicOffIcon />}
        </div>
      )}

      {displayName ? (
        <div className="absolute bottom-2 left-2 z-10 rounded-md bg-black/50 px-2 py-1 text-xs text-gray-100">
          {displayName}
        </div>
      ) : (
        <div className="absolute bottom-2 left-2 z-10 rounded-md bg-black/50 px-2 py-1 text-xs text-gray-100">
          {playerIndex === "host" ? "Host" : playerIndex}
        </div>
      )}
    </div>
  );
}
