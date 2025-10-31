"use client";

import {
  ControlBar,
  RoomAudioRenderer,
  RoomContext,
  useTracks,
} from "@livekit/components-react";
import { Room, Track } from "livekit-client";
import "@livekit/components-styles";
import PlayerCircle from "@/components/game/PlayerCircle";
import { useEffect, useRef, useState } from "react";
import { FullscreenEnterIcon, FullscreenExitIcon } from "@/assets/icons";

export default function LiveKitTestComponent({
  room,
  hostUserId,
}: {
  room: Room;
  hostUserId: string;
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
        style={{ height: "100vh", position: "relative" }}
      >
        <button
          type="button"
          aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
          onClick={toggleFullscreen}
          className="absolute right-2 top-2 z-50 rounded-md bg-black/50 p-2 text-white hover:bg-black/70"
        >
          {isFullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}
        </button>

        <MyVideoConference hostUserId={hostUserId} />
        <RoomAudioRenderer />
        <ControlBar />
      </div>
    </RoomContext.Provider>
  );
}

function MyVideoConference({ hostUserId }: { hostUserId: string }) {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );
  console.log("🚀 ~ MyVideoConference ~ tracks:", tracks);
  return (
    <div
      style={{
        height: "calc(100vh - var(--lk-control-bar-height))",
        width: "100vh",
      }}
      className="w-full h-full"
    >
      <PlayerCircle tracks={tracks} hostUserId={hostUserId} />
    </div>
  );
}
