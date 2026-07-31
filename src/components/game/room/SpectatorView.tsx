"use client";

import {
  RoomAudioRenderer,
  RoomContext,
  useTracks,
} from "@livekit/components-react";
import { Room, Track } from "livekit-client";
import "@livekit/components-styles";
import { useTranslations } from "next-intl";
import PlayerCircle from "@/components/game/room/PlayerCircle";
import GameRoomHeader from "@/components/game/room/GameRoomHeader";
import StaffToolsButton from "@/components/game/staff-tools";
import { useRef } from "react";
import { useGameBroadcasts } from "@/hooks/game/useGameBroadcasts";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import type { Id } from "@convex/_generated/dataModel";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
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

  // Room-wide notifications (staff broadcasts + system pushes) as toasts.
  useGameBroadcasts(gameId as Id<"games">);

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
        <StaffToolsButton />
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
  const t = useTranslations("game.session");
  const { maxPlayers, ruleset } = useGameRoom();
  // A "wide" ring (more columns than rows, e.g. Sports' 4×3) is capped to a
  // shorter block in portrait so its cells don't get too tall (see game.css).
  const { cols, rows } = ruleset.seatLayout;
  const isWideGrid = cols > rows;
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );

  const hasAnyTracks = tracks.length > 0;

  return (
    <div className="w-full h-full flex items-center justify-center">
      {!hasAnyTracks && <LoadingSpinner message={t("waitingForPlayers")} />}
      {hasAnyTracks && (
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
