"use client";

import { JOIN_REQUEST_STATUSES } from "@/lib/constants/game";
import LiveKitTestComponent from "../liveKit/LiveKitTestComponent";
import SpectatorView from "./SpectatorView";
import WaitingRoom from "./WaitingRoom";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import LoadingSpinner from "../ui/LoadingSpinner";

export default function Room() {
  const {
    gameId,
    userId,
    hostUserId,
    isHost,
    isSpectator,
    room,
    livekitToken,
    joinStatus,
    isJoiningGame,
    joinError,
  } = useGameRoom();

  // Spectator mode - simplified view without local video
  // Only rendered when user has a valid spectator record (validated server-side in page.tsx)
  // The spectator join prompt is shown at the page level before this component mounts
  if (isSpectator) {
    if (!livekitToken) {
      return (
        <div className="flex h-full items-center justify-center text-gray-600 dark:text-gray-300">
          <LoadingSpinner message="Connecting as spectator..." />
        </div>
      );
    }

    return (
      <SpectatorView
        gameId={gameId}
        room={room}
        hostUserId={hostUserId}
        token={livekitToken}
        userId={userId}
      />
    );
  }

  // Regular player mode
  if (isJoiningGame) {
    return (
      <div className="flex h-full items-center justify-center text-gray-600 dark:text-gray-300">
        <LoadingSpinner message="Joining game..." />
      </div>
    );
  }

  if (joinError) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        {joinError}
      </div>
    );
  }

  return (
    <>
      {joinStatus !== undefined &&
        joinStatus !== JOIN_REQUEST_STATUSES.ACCEPTED &&
        !isHost && (
          <WaitingRoom
            status={joinStatus ?? undefined}
            gameId={gameId}
            userId={userId}
          />
        )}

      {((joinStatus !== undefined &&
        joinStatus === JOIN_REQUEST_STATUSES.ACCEPTED) ||
        isHost) && (
        <LiveKitTestComponent
          gameId={gameId}
          room={room}
          hostUserId={hostUserId}
          token={livekitToken ?? ""}
          isHost={isHost}
          userId={userId}
        />
      )}
      {joinStatus === JOIN_REQUEST_STATUSES.REJECTED && (
        <div className="flex h-full items-center justify-center text-red-500">
          You have been rejected from the game.
        </div>
      )}
    </>
  );
}
