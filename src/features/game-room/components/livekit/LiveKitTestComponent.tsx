"use client";

import {
  RoomAudioRenderer,
  RoomContext,
  useTracks,
} from "@livekit/components-react";
import { Room, Track } from "livekit-client";
import "@livekit/components-styles";
import { useTranslations } from "next-intl";
import PlayerCircle from "@/features/game-room/components/room/PlayerCircle";
import GameRoomHeader from "@/features/game-room/components/room/GameRoomHeader";
import { useRef } from "react";
import { useSpeakingAutoMute, useDeadPlayerMute } from "@/hooks/livekit";
import { useGameBroadcasts } from "@/hooks/game/useGameBroadcasts";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import type { Id } from "@convex/_generated/dataModel";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import AudioPlaybackModal from "@/features/game-room/components/livekit/AudioPlaybackModal";
import MicPermissionModal from "@/features/game-room/components/livekit/MicPermissionModal";
import CardPickingBoard from "@/features/game-room/components/card-picking/CardPickingBoard";

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
  const { gameSessionState, players, maxPlayers } = useGameRoom();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Room-wide notifications (staff broadcasts + system pushes) as toasts.
  useGameBroadcasts(gameId as Id<"games">);

  useSpeakingAutoMute(
    room,
    gameSessionState,
    players,
    userId,
    isHost,
    maxPlayers,
  );

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
        <MicPermissionModal />
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
  const tLivekit = useTranslations("game.livekit");
  const { maxPlayers, ruleset } = useGameRoom();
  // A "wide" ring (more columns than rows, e.g. Sports' 4×3) is capped to a
  // shorter block in portrait so its cells don't get too tall (see game.css).
  const { cols, rows } = ruleset.seatLayout;
  const isWideGrid = cols > rows;
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );
  const track = tracks.find((t) => t.participant.identity === userId);
  return (
    <div className="w-full h-full flex items-center justify-center">
      {!track && <LoadingSpinner message={tLivekit("loadingVideo")} />}
      {track && (
        <div
          className={`game-grid-container w-full h-full${
            isWideGrid ? " game-grid-container--wide" : ""
          }`}
        >
          <PlayerCircle
            gameId={gameId}
            tracks={tracks}
            hostUserId={hostUserId}
            userId={userId}
            maxPlayers={maxPlayers ?? 12}
          />
        </div>
      )}
    </div>
  );
}
