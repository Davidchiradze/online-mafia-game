"use client";

import {
  RoomAudioRenderer,
  RoomContext,
  StartAudio,
  useTracks,
} from "@livekit/components-react";
import { Room, Track } from "livekit-client";
import "@livekit/components-styles";
import PlayerCircle from "@/components/game/PlayerCircle";
import { useRef } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { GAME_PHASE_LABELS } from "@/lib/constants/game";
import { EyeIcon } from "@/assets/icons";
import FloatingOptions from "@/components/liveKit/FloatingOptions";
import LoadingSpinner from "../ui/LoadingSpinner";

type SpectatorViewProps = {
  gameId: string;
  room: Room;
  hostUserId: string | null;
  token: string;
  userId: string;
};

/**
 * SpectatorView - View-only mode for spectators watching a game in progress.
 * - No local video (spectators don't publish)
 * - No host controls / voting UI
 * - Shows "Spectating" badge
 * - Visibility same as dead players (covered during night phases)
 */
export default function SpectatorView({
  gameId,
  room,
  hostUserId,
  userId,
}: SpectatorViewProps) {
  const { disconnect, gameSessionState } = useGameRoom();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Get display label for the current game phase
  const gamePhaseLabel = gameSessionState?.gamePhase
    ? (GAME_PHASE_LABELS[
        gameSessionState.gamePhase as keyof typeof GAME_PHASE_LABELS
      ] ?? gameSessionState.gamePhase)
    : null;

  return (
    <RoomContext.Provider value={room}>
      <div
        ref={containerRef}
        data-lk-theme="default"
        className="w-full h-full flex flex-col items-center justify-center relative"
      >
        {/* Spectating Badge */}
        <div className="fixed top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/90 text-black font-medium text-sm shadow-lg backdrop-blur-sm">
          <EyeIcon width={16} height={16} />
          <span>Spectating</span>
        </div>

        {/* Floating Options - reusing shared component */}
        <FloatingOptions
          gameId={gameId}
          isHost={false}
          canFinishGame={false}
          onLeaveRoom={disconnect}
          leaveLabel="Stop spectating"
        />

        <SpectatorVideoConference
          gameId={gameId}
          hostUserId={hostUserId}
          userId={userId}
        />
        <RoomAudioRenderer />
        <StartAudio label="Click to allow audio playback" />
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

  // Spectators don't publish, so we don't wait for own track
  // Just show player circle when we have any tracks
  const hasAnyTracks = tracks.length > 0;

  return (
    <div className="w-full h-full flex items-center justify-center py-5 px-10">
      {!hasAnyTracks && <LoadingSpinner message="Waiting for players..." />}
      {hasAnyTracks && (
        <PlayerCircle
          gameId={gameId}
          tracks={tracks}
          hostUserId={hostUserId}
          userId={userId}
        />
      )}
    </div>
  );
}
