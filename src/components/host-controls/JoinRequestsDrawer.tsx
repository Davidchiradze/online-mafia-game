"use client";
import { useEffect, useState } from "react";
import Drawer from "@/components/ui/Drawer";
import {
  acceptJoinRequest,
  fetchPendingJoinRequests,
  onPendingJoinRequests,
  rejectJoinRequest,
} from "@/lib/gameSession/actions";
import { JoinRequest } from "@/types/game/type";

type Props = {
  gameId: string;
  open: boolean;
  onClose: () => void;
};

export default function JoinRequestsDrawer({ gameId, open, onClose }: Props) {
  const [pending, setPending] = useState<JoinRequest[]>([]);

  useEffect(() => {
    if (!open) return;
    let unsub: (() => void) | null = null;
    const init = async () => {
      const res = await fetchPendingJoinRequests(gameId);
      if (res.ok) setPending(res.data);
      unsub = onPendingJoinRequests(gameId, (event, req) => {
        if (event === "insert") setPending((p) => [req, ...p]);
        else if (event === "update")
          setPending((p) =>
            p
              .map((r) => (r.id === req.id ? req : r))
              .filter((r) => r.status === "pending")
          );
        else if (event === "delete")
          setPending((p) => p.filter((r) => r.id !== req.id));
      });
    };
    init();
    return () => {
      if (unsub) unsub();
    };
  }, [gameId, open]);

  const approve = async (id: string) => {
    await acceptJoinRequest(id);
  };
  const reject = async (id: string) => {
    await rejectJoinRequest(id);
  };

  return (
    <Drawer open={open} onClose={onClose} title="Join Requests" size="md">
      {pending.length === 0 ? (
        <div className="text-gray-600 dark:text-gray-400">
          No pending requests
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="text-gray-800 dark:text-gray-200 text-sm">
                {r.requester_id}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => approve(r.id)}
                  className="px-3 py-1 rounded-md bg-green-600 text-white"
                >
                  Approve
                </button>
                <button
                  onClick={() => reject(r.id)}
                  className="px-3 py-1 rounded-md bg-red-600 text-white"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
