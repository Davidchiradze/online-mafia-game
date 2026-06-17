"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { joinRequests } from "@convex/refs/lobby";
import Drawer from "@/components/ui/Drawer";
import UserAvatar from "@/components/ui/UserAvatar";
import { Check, X, UserPlus, Users } from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";

type Props = {
  gameId: string;
  open: boolean;
  onClose: () => void;
};

type RequestStatus = "pending" | "accepted" | "rejected";

const STATUS_CONFIG: Record<
  RequestStatus,
  { label: string; dot: string; row: string }
> = {
  pending: {
    label: "Pending",
    dot: "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.5)]",
    row: "border-amber-500/20 bg-amber-500/[0.04]",
  },
  accepted: {
    label: "Accepted",
    dot: "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]",
    row: "border-emerald-500/20 bg-emerald-500/[0.04]",
  },
  rejected: {
    label: "Rejected",
    dot: "bg-red-400/60",
    row: "border-red-500/10 bg-red-500/[0.03]",
  },
};

export default function JoinRequestsDrawer({ gameId, open, onClose }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const requests = useQuery(
    joinRequests.listByGame,
    open ? { gameId: gameId as Id<"games"> } : "skip",
  );

  const acceptRequest = useMutation(joinRequests.accept);
  const rejectRequest = useMutation(joinRequests.reject);

  const pendingCount =
    requests?.filter((r) => r.status === "pending").length ?? 0;
  const sortedRequests = requests
    ? [...requests].sort((a, b) => {
        const order: Record<string, number> = {
          pending: 0,
          accepted: 1,
          rejected: 2,
        };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      })
    : [];

  const handleAccept = async (requestId: Id<"joinRequests">) => {
    setLoadingId(requestId);
    try {
      await acceptRequest({ requestId });
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (requestId: Id<"joinRequests">) => {
    setLoadingId(requestId);
    try {
      await rejectRequest({ requestId });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Join Requests"
      size="md"
      variant="dark"
    >
      {pendingCount > 0 && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06]">
          <UserPlus className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-amber-300/90 text-xs font-medium font-inter">
            {pendingCount} pending {pendingCount === 1 ? "request" : "requests"}
          </span>
        </div>
      )}

      {sortedRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="w-12 h-12 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center">
            <Users className="w-6 h-6 text-gray-600" />
          </div>
          <p className="text-gray-500 font-inter text-sm">
            No join requests yet
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedRequests.map((r) => {
            const config = STATUS_CONFIG[r.status as RequestStatus];
            const isLoading = loadingId === r._id;
            const isPending = r.status === "pending";
            const isAccepted = r.status === "accepted";
            const isRejected = r.status === "rejected";

            return (
              <div
                key={r._id}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-colors ${config.row}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`}
                  />
                  <UserAvatar
                    src={r.requesterAvatar}
                    name={r.requesterNickname}
                    size={28}
                  />
                  <span className="text-white/90 text-sm font-medium font-inter truncate">
                    {r.requesterNickname}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isPending && (
                    <>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleAccept(r._id)}
                        className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50 cursor-pointer"
                        aria-label={`Accept ${r.requesterNickname}`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleReject(r._id)}
                        className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50 cursor-pointer"
                        aria-label={`Reject ${r.requesterNickname}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  {isAccepted && (
                    <>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleReject(r._id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                        aria-label={`Reject ${r.requesterNickname}`}
                        title="Reject access"
                      >
                        <X className="w-3 h-3" />
                        <span className="text-xs font-inter">Reject</span>
                      </button>
                    </>
                  )}

                  {isRejected && (
                    <>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleAccept(r._id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-white/30 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                        aria-label={`Re-accept ${r.requesterNickname}`}
                        title="Allow again"
                      >
                        <Check className="w-3 h-3" />
                        <span className="text-xs font-inter">Allow</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}
