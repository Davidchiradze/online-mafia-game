"use client";

import {
  RoomAudioRenderer,
  RoomContext,
  useTracks,
} from "@livekit/components-react";
import { Room, Track } from "livekit-client";
import "@livekit/components-styles";
import PlayerCircle from "@/components/game/PlayerCircle";
import GameRoomHeader from "@/components/game/GameRoomHeader";
import { useRef } from "react";
import LoadingSpinner from "../ui/LoadingSpinner";
import AudioPlaybackModal from "@/components/liveKit/AudioPlaybackModal";

type SpectatorViewProps = {
  gameId: string;
  room: Room;
  hostUserId: string | null;
  token: string;
  userId: string;
};

export default function SpectatorView({
  gameId,
  room,
  hostUserId,
  userId,
}: SpectatorViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <RoomContext.Provider value={room}>
      <div
        ref={containerRef}
        data-lk-theme="default"
        className="w-full h-full flex flex-col"
      >
        <GameRoomHeader />

        <div className="flex-1 min-h-0">
          <SpectatorVideoConference
            gameId={gameId}
            hostUserId={hostUserId}
            userId={userId}
          />
        </div>
        <RoomAudioRenderer />
        <AudioPlaybackModal room={room} />
      </div>
    </RoomContext.Provider>
  );
}

function SpectatorVideoConference({
  gameId,
  hostUserId,
  userId,
}: {
  gameId: string;
  hostUserId: string | null;
  userId: string;
}) {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );

  const hasAnyTracks = tracks.length > 0;

  return (
    <div className="w-full h-full flex items-center justify-center">
      {!hasAnyTracks && <LoadingSpinner message="Waiting for players..." />}
      {hasAnyTracks && (
        <div className="game-grid-container w-full h-full">
          <PlayerCircle
            gameId={gameId}
            tracks={tracks}
            hostUserId={hostUserId}
            userId={userId}
          />
        </div>
      )}
    </div>
  );
}
