"use client";

import {
  RoomAudioRenderer,
  RoomContext,
  useTracks,
} from "@livekit/components-react";
import { Room, Track } from "livekit-client";
import "@livekit/components-styles";
import PlayerCircle from "@/components/game/PlayerCircle";
import { useEffect, useRef, useState } from "react";
import FloatingOptions from "./FloatingOptions";
import { useRoleAssignmentNotification } from "@/hooks/useRoleAssignmentNotification";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import LoadingSpinner from "../ui/LoadingSpinner";

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
  const { disconnect } = useGameRoom();
  // Connect to room
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Role assignment notification
  useRoleAssignmentNotification(gameId, userId);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const enterFullscreen = async () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) return;
    try {
      await containerRef.current.requestFullscreen();
    } catch {
      // noop
    }
  };

  const exitFullscreen = async () => {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {
      // noop
    }
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      void exitFullscreen();
    } else {
      void enterFullscreen();
    }
  };

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
          onToggleFullscreen={toggleFullscreen}
          onLeaveRoom={disconnect}
        />

        <MyVideoConference
          gameId={gameId}
          hostUserId={hostUserId}
          userId={userId}
        />
        <RoomAudioRenderer />
        {/* <ControlBar /> */}
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
    { onlySubscribed: false }
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
