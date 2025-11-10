"use client";

import { JOIN_REQUEST_STATUSES } from "@/lib/constants/game";
import LiveKitTestComponent from "../liveKit/LiveKitTestComponent";
import WaitingRoom from "./WaitingRoom";
import { useGameRoom } from "@/lib/context/gameRoomContext";

export default function Room() {
  const { gameId, userId, hostUserId, isHost, room, livekitToken, joinStatus } =
    useGameRoom();

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
