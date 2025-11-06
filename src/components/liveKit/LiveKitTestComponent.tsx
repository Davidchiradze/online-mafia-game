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

export default function LiveKitTestComponent({
  gameId,
  room,
  hostUserId,
  token,
  userId,
  isHost,
}: {
  gameId: string;
  room: Room;
  hostUserId: string;
  token: string;
  userId: string;
  isHost: boolean;
}) {
  // Connect to room
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

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
    } catch (err) {
      // noop
    }
  };

  const exitFullscreen = async () => {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch (err) {
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
          onLeaveRoom={() => room.disconnect()}
        />

        <MyVideoConference
          gameId={gameId}
          hostUserId={hostUserId}
          userId={userId}
          isFullscreen={isFullscreen}
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
  isFullscreen,
  userId,
}: {
  gameId: string;
  hostUserId: string;
  isFullscreen: boolean;
  userId: string;
}) {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );
  return (
    <div className="w-full h-full">
      <PlayerCircle
        gameId={gameId}
        tracks={tracks}
        hostUserId={hostUserId}
        userId={userId}
      />
    </div>
  );
}
