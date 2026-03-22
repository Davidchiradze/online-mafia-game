"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { joinRequests } from "@convex/refs/lobby";
import Drawer from "@/components/ui/Drawer";
import type { Id } from "@convex/_generated/dataModel";

type Props = {
  gameId: string;
  open: boolean;
  onClose: () => void;
};

export default function JoinRequestsDrawer({ gameId, open, onClose }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const requests = useQuery(
    joinRequests.listByGame,
    open ? { gameId: gameId as Id<"games"> } : "skip",
  );

  const acceptRequest = useMutation(joinRequests.accept);
  const rejectRequest = useMutation(joinRequests.reject);

  const pendingRequests = requests?.filter((r) => r.status === "pending") ?? [];

  const handleToggle = async (
    requestId: Id<"joinRequests">,
    currentStatus: string,
  ) => {
    setLoadingId(requestId);
    try {
      if (currentStatus === "accepted") {
        await rejectRequest({ requestId });
      } else {
        await acceptRequest({ requestId });
      }
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Join Requests" size="md">
      {requests?.length === 0 ? (
        <div className="text-gray-600 dark:text-gray-400">
          No pending requests
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests?.map((r) => (
            <div
              key={r._id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="text-gray-800 dark:text-gray-200 text-sm">
                {r.requesterNickname}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={loadingId === r._id}
                  aria-label="Toggle accept"
                  onClick={() => handleToggle(r._id, r.status)}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer"
                >
                  <span
                    className={
                      `absolute inset-0 rounded-full transition-colors ` +
                      (r.status === "accepted"
                        ? `bg-green-500`
                        : `bg-gray-300 dark:bg-gray-700`)
                    }
                  />
                  <span
                    className={
                      `pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ` +
                      (r.status === "accepted"
                        ? `translate-x-6`
                        : `translate-x-1`)
                    }
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
