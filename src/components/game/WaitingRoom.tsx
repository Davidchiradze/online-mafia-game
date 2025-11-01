"use client";
import { useMyJoinRequestStatus } from "@/hooks/useJoinRequests";
import { JOIN_REQUEST_STATUSES } from "@/lib/constants/game";
import { JoinRequest } from "@/types/game/type";

export default function WaitingRoom({
  status,
  gameId,
  userId,
  setStatus,
}: {
  status: JoinRequest["status"] | undefined;
  gameId: string;
  userId: string;
  setStatus: (status: JoinRequest["status"]) => void;
}) {
  const handleJoinResponse = (status: JoinRequest["status"]) => {
    setStatus(status);
  };
  useMyJoinRequestStatus(gameId, userId, handleJoinResponse);

  return (
    <div>
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
    </div>
  );
}
