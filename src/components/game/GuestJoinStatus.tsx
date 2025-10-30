"use client";

import { useState } from "react";
import { useMyJoinRequestStatus } from "@/hooks/useJoinRequests";
import { JoinRequest } from "@/types/game/type";

export default function GuestJoinStatus({
  gameId,
  userId,
}: {
  gameId: string;
  userId: string;
}) {
  const [status, setStatus] = useState<JoinRequest["status"] | null>(null);
  useMyJoinRequestStatus(gameId, userId, setStatus);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="text-gray-900 dark:text-white text-lg font-semibold mb-2">
        Waiting for host approval
      </div>
      <div className="text-gray-600 dark:text-gray-400">
        You will join automatically once approved.
      </div>
      {status === "rejected" ? (
        <div className="mt-4 text-red-600">Your request was rejected.</div>
      ) : null}
    </div>
  );
}
