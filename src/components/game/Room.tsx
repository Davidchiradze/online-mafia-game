"use client";

import { JOIN_REQUEST_STATUSES } from "@/lib/constants/game";
import LiveKitTestComponent from "../liveKit/LiveKitTestComponent";
import WaitingRoom from "./WaitingRoom";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import LoadingSpinner from "../ui/LoadingSpinner";

export default function Room() {
  const {
    gameId,
    userId,
    hostUserId,
    isHost,
    room,
    livekitToken,
    joinStatus,
    isJoiningGame,
    joinError,
  } = useGameRoom();

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
      {joinStatus !== JOIN_REQUEST_STATUSES.ACCEPTED && !isHost && (
        <WaitingRoom
          status={joinStatus ?? undefined}
          gameId={gameId}
          userId={userId}
        />
      )}

      {(joinStatus === JOIN_REQUEST_STATUSES.ACCEPTED || isHost) && (
        <LiveKitTestComponent
          gameId={gameId}
          room={room}
          hostUserId={hostUserId}
          token={livekitToken ?? ""}
          isHost={isHost}
          userId={userId}
        />
      )}
    </>
  );
}
