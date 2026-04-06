"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { joinRequests } from "@convex/refs/lobby";
import { toast } from "@/lib/utils/toast";
import { toast as toastifyDismiss } from "react-toastify";
import { Check, X } from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Toast body rendered inside each join-request notification
// ---------------------------------------------------------------------------

function JoinRequestToastBody({
  nickname,
  requestId,
  onAccept,
  onReject,
}: {
  nickname: string;
  requestId: Id<"joinRequests">;
  onAccept: (id: Id<"joinRequests">) => Promise<void>;
  onReject: (id: Id<"joinRequests">) => Promise<void>;
}) {
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);

  const handle = async (action: "accept" | "reject") => {
    setLoading(action);
    try {
      if (action === "accept") {
        await onAccept(requestId);
      } else {
        await onReject(requestId);
      }
    } catch {
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/90 truncate">
        <span className="font-semibold text-white">{nickname}</span> wants to
        join
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => handle("accept")}
          className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 cursor-pointer"
          aria-label={`Accept ${nickname}`}
        >
          {loading === "accept" ? (
            <span className="spinner spinner-sm border-emerald-400/30 border-t-emerald-400" />
          ) : (
            <Check className="w-4 h-4" />
          )}
        </button>
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => handle("reject")}
          className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50 cursor-pointer"
          aria-label={`Reject ${nickname}`}
        >
          {loading === "reject" ? (
            <span className="spinner spinner-sm border-red-400/30 border-t-red-400" />
          ) : (
            <X className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Subscribes to pending join requests for a game and fires an actionable
 * toast (with Accept / Reject buttons) for each new request. Skips the
 * initial render so page load / reconnect doesn't produce false toasts.
 *
 * When the request is accepted/rejected (from toast or drawer), the
 * corresponding toast is automatically dismissed.
 */
export function useJoinRequestNotification(
  gameId: string,
  isHost: boolean,
) {
  const pendingRequests = useQuery(
    joinRequests.listPending,
    isHost ? { gameId: gameId as Id<"games"> } : "skip",
  );
  const acceptMutation = useMutation(joinRequests.accept);
  const rejectMutation = useMutation(joinRequests.reject);

  const knownIdsRef = useRef<Set<string> | null>(null);
  const toastIdsRef = useRef<Map<string, string | number>>(new Map());

  const handleAccept = useCallback(
    async (requestId: Id<"joinRequests">) => {
      const toastId = toastIdsRef.current.get(requestId);
      if (toastId !== undefined) toastifyDismiss.dismiss(toastId);
      await acceptMutation({ requestId });
    },
    [acceptMutation],
  );

  const handleReject = useCallback(
    async (requestId: Id<"joinRequests">) => {
      const toastId = toastIdsRef.current.get(requestId);
      if (toastId !== undefined) toastifyDismiss.dismiss(toastId);
      await rejectMutation({ requestId });
    },
    [rejectMutation],
  );

  useEffect(() => {
    if (!pendingRequests) return;

    const currentIds = new Set(pendingRequests.map((r) => r._id as string));

    if (knownIdsRef.current === null) {
      knownIdsRef.current = currentIds;
      return;
    }

    for (const req of pendingRequests) {
      const id = req._id as string;
      if (!knownIdsRef.current.has(id)) {
        const toastId = toast.info(
          <JoinRequestToastBody
            nickname={req.requesterNickname}
            requestId={req._id}
            onAccept={handleAccept}
            onReject={handleReject}
          />,
          { autoClose: 15000, closeOnClick: false },
        );
        if (toastId !== undefined) {
          toastIdsRef.current.set(id, toastId);
        }
      }
    }

    for (const id of toastIdsRef.current.keys()) {
      if (!currentIds.has(id)) {
        const toastId = toastIdsRef.current.get(id);
        if (toastId !== undefined) toastifyDismiss.dismiss(toastId);
        toastIdsRef.current.delete(id);
      }
    }

    knownIdsRef.current = currentIds;
  }, [pendingRequests, handleAccept, handleReject]);
}
