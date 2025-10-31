"use client";

import { useEffect, useState } from "react";
import { useMyJoinRequestStatus } from "@/hooks/useJoinRequests";
import { JoinRequest } from "@/types/game/type";
import { JOIN_REQUEST_STATUSES } from "@/lib/constants/game";
import { checkOrRequestJoin } from "@/lib/gameSession/actions";
import LiveKitTestComponent from "../liveKit/LiveKitTestComponent";
import { Room } from "livekit-client";
import { generateLivekitAccessToken } from "@/lib/liveKit/actions";

export default function WaitingRoom({
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
      new Room({
        // Optimize video quality for each participant's screen
        adaptiveStream: true,
        // Enable automatic audio/video quality optimization
        dynacast: true,
      })
  );

  const handleJoinResponse = (status: JoinRequest["status"]) => {
    setStatus(status);
  };
  useMyJoinRequestStatus(gameId, userId, handleJoinResponse);

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
      <div className="text-gray-900 dark:text-white text-lg font-semibold mb-2">
        Waiting for host approval
      </div>
      <div className="text-gray-600 dark:text-gray-400">
        You will join automatically once approved.
      </div>

      {status === JOIN_REQUEST_STATUSES.ACCEPTED ? (
        <div className="  mt-4 text-green-600">You have joined the game.</div>
      ) : (
        <div className="mt-4 text-gray-600">Waiting for host approval.</div>
      )}

      {(status === JOIN_REQUEST_STATUSES.ACCEPTED || isHost) && (
        <LiveKitTestComponent room={room} hostUserId={hostUserId} />
      )}
    </div>
  );
}
