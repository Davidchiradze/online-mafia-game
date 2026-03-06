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
import FloatingOptions from "./FloatingOptions";
import { useRoleAssignmentNotification } from "@/hooks/game";
import { useSpeakingAutoMute, useDeadPlayerMute } from "@/hooks/livekit";
import { useFullscreen } from "@/hooks/ui";
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
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);

  // Role assignment notification - triggers modal when role is first assigned
  const { showRoleModal, role, description, closeRoleModal } =
    useRoleAssignmentNotification(viewerRole);

  // Auto mute/unmute based on speaking round state
  // Players listen to current_speaker_index and mute/unmute themselves
  useSpeakingAutoMute(room, gameSessionState, players, userId, isHost);

  // Disable microphone and camera for dead players
  // Dead players cannot speak or show video for the rest of the game
  // When game is finished (gameSessionState.is_finished), all cameras are enabled for role reveal
  const isGameFinished = Boolean(gameSessionState?.is_finished);
  useDeadPlayerMute(room, players, userId, isGameFinished);

  return (
    <RoomContext.Provider value={room}>
      <div
        ref={containerRef}
        data-lk-theme="default"
        className="w-full h-full flex flex-col items-center justify-center"
      >
        <FloatingOptions
          gameId={gameId}
          isHost={isHost}
          isFullscreen={isFullscreen}
          canFinishGame={isHost && !isGameFinished}
          onToggleFullscreen={toggleFullscreen}
          onLeaveRoom={disconnect}
        />

        <MyVideoConference
          gameId={gameId}
          hostUserId={hostUserId}
          userId={userId}
        />
        <RoomAudioRenderer />
        <StartAudio label="Click to allow audio playback" />
        {/* <ControlBar /> */}

        {/* Role Reveal Modal */}
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
    <div className="w-full h-full flex items-center justify-center py-5 px-10">
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
