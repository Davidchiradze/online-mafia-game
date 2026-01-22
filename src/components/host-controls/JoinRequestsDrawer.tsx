"use client";
import { useCallback, useEffect, useState } from "react";
import Drawer from "@/components/ui/Drawer";
import {
  acceptJoinRequest,
  fetchPendingJoinRequests,
  rejectJoinRequest,
} from "@/lib/gameRoom/actions";
import { usePendingJoinRequests } from "@/hooks/realtime";
import { JoinRequest } from "@/types/game/type";
import { JOIN_REQUEST_STATUSES } from "@/lib/constants/game";
type Props = {
  gameId: string;
  open: boolean;
  onClose: () => void;
};

export default function JoinRequestsDrawer({ gameId, open, onClose }: Props) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    if (!open) return;
    const init = async () => {
      const res = await fetchPendingJoinRequests(gameId);
      if (res.ok) setRequests(res.data);
    };
    init();
  }, [gameId, open]);

  const handlePendingEvent = useCallback(
    (event: "insert" | "update", req: JoinRequest) => {
      if (event === "insert") setRequests((p) => [req, ...p]);
      else if (event === "update") {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === req.id
              ? {
                  ...req,
                  status: req.status,
                }
              : r
          )
        );
      }
    },
    []
  );

  usePendingJoinRequests(gameId, handlePendingEvent, open);
  const approve = async (id: string) => {
    setIsLoading(true);
    await acceptJoinRequest(id);
    setIsLoading(false);
  };
  const reject = async (id: string) => {
    setIsLoading(true);
    await rejectJoinRequest(id);
    setIsLoading(false);
  };

  return (
    <Drawer open={open} onClose={onClose} title="Join Requests" size="md">
      {requests.length === 0 ? (
        <div className="text-gray-600 dark:text-gray-400">
          No pending requests
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="text-gray-800 dark:text-gray-200 text-sm">
                {r.requester_nickname}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isLoading}
                  aria-label="Toggle accept"
                  // aria-pressed={r.status === JOIN_REQUEST_STATUSES.ACCEPTED}
                  onClick={() =>
                    r.status === JOIN_REQUEST_STATUSES.ACCEPTED
                      ? reject(r.id)
                      : approve(r.id)
                  }
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer"
                >
                  <span
                    className={
                      `absolute inset-0 rounded-full transition-colors ` +
                      (r.status === JOIN_REQUEST_STATUSES.ACCEPTED
                        ? `bg-green-500`
                        : `bg-gray-300 dark:bg-gray-700`)
                    }
                  />
                  <span
                    className={
                      `pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ` +
                      (r.status === JOIN_REQUEST_STATUSES.ACCEPTED
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
