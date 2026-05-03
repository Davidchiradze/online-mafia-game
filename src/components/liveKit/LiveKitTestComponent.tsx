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
import { useSpeakingAutoMute, useDeadPlayerMute } from "@/hooks/livekit";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import LoadingSpinner from "../ui/LoadingSpinner";
import AudioPlaybackModal from "@/components/liveKit/AudioPlaybackModal";
import CardPickingBoard from "@/components/gameSession/cardPicking/CardPickingBoard";

export default function LiveKitTestComponent({
  gameId,
  room,
  hostUserId,
  userId,
  isHost,
}: {
  gameId: string;
  room: Room;
  hostUserId: string | null;
  token: string;
  userId: string;
  isHost: boolean;
}) {
  const { gameSessionState, players } = useGameRoom();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useSpeakingAutoMute(room, gameSessionState, players, userId, isHost);

  // When the game is finished (`gameSessionState.isFinished`) all cameras are
  // re-enabled so the final role reveal works for dead players too.
  const isGameFinished = Boolean(gameSessionState?.isFinished);
  useDeadPlayerMute(room, players, userId, isGameFinished);

  return (
    <RoomContext.Provider value={room}>
      <div
        ref={containerRef}
        data-lk-theme="default"
        className="w-full h-full flex flex-col"
      >
        <GameRoomHeader />

        <div className="flex-1 min-h-0">
          <MyVideoConference
            gameId={gameId}
            hostUserId={hostUserId}
            userId={userId}
          />
        </div>
        <RoomAudioRenderer />
        <AudioPlaybackModal room={room} />
        <CardPickingBoard />
      </div>
    </RoomContext.Provider>
  );
}

function MyVideoConference({
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
  const track = tracks.find((t) => t.participant.identity === userId);
  return (
    <div className="w-full h-full flex items-center justify-center">
      {!track && <LoadingSpinner message="Loading..." />}
      {track && (
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
