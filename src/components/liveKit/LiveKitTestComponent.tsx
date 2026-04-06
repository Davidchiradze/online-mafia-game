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
import GameRoomHeader from "@/components/game/GameRoomHeader";
import { useRef } from "react";
import { useRoleAssignmentNotification } from "@/hooks/game";
import { useSpeakingAutoMute, useDeadPlayerMute } from "@/hooks/livekit";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import LoadingSpinner from "../ui/LoadingSpinner";
import RoleRevealModal from "@/components/modals/RoleRevealModal";

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
  const { disconnect, viewerRole, gameSessionState, players } = useGameRoom();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Role assignment notification - triggers modal when role is first assigned
  const { showRoleModal, role, description, closeRoleModal } =
    useRoleAssignmentNotification(viewerRole);

  // Auto mute/unmute based on speaking round state
  // Players listen to currentSpeakerIndex and mute/unmute themselves
  useSpeakingAutoMute(room, gameSessionState, players, userId, isHost);

  // Disable microphone and camera for dead players
  // Dead players cannot speak or show video for the rest of the game
  // When game is finished (gameSessionState.isFinished), all cameras are enabled for role reveal
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
        <StartAudio label="Click to allow audio playback" />

        {role && (
          <RoleRevealModal
            isOpen={showRoleModal}
            role={role}
            description={description}
            onClose={closeRoleModal}
          />
        )}
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
