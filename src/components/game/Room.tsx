"use client";

import { useEffect, useState } from "react";
import { useMyJoinRequestStatus } from "@/hooks/useJoinRequests";
import { JoinRequest } from "@/types/game/type";
import { JOIN_REQUEST_STATUSES } from "@/lib/constants/game";
import { checkOrRequestJoin } from "@/lib/gameSession/actions";
import LiveKitTestComponent from "../liveKit/LiveKitTestComponent";
import { Room as LiveKitRoom } from "livekit-client";
import { generateLivekitAccessToken } from "@/lib/liveKit/actions";
import WaitingRoom from "./WaitingRoom";

export default function Room({
  gameId,
  userId,
  isHost,
  hostUserId,
}: {
  gameId: string;
  userId: string;
  isHost: boolean;
  hostUserId: string;
}) {
  const [status, setStatus] = useState<JoinRequest["status"] | undefined>(
    undefined
  );
  const [room] = useState(
    () =>
      new LiveKitRoom({
        // Optimize video quality for each participant's screen
        adaptiveStream: true,
        // Enable automatic audio/video quality optimization
        dynacast: true,
      })
  );

  useEffect(() => {
    checkOrRequestJoin(gameId).then((res) => {
      if (res?.ok && res.allowed) {
        setStatus(res.status);
      }
    });
  }, [gameId]);

  useEffect(() => {
    if (status === JOIN_REQUEST_STATUSES.ACCEPTED || isHost) {
      generateLivekitAccessToken(gameId, userId).then((token) => {
        room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token || "");
        room.localParticipant.setCameraEnabled(true);
      });
      //
    }
  }, [status, gameId, userId]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
      {status !== JOIN_REQUEST_STATUSES.ACCEPTED && !isHost && (
        <WaitingRoom
          status={status ?? undefined}
          gameId={gameId}
          userId={userId}
          setStatus={setStatus}
        />
      )}

      {(status === JOIN_REQUEST_STATUSES.ACCEPTED || isHost) && (
        <LiveKitTestComponent room={room} hostUserId={hostUserId} />
      )}
    </div>
  );
}
