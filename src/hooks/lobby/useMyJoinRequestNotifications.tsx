"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery } from "convex/react";
import { joinRequests } from "@convex/refs/lobby";
import { toast } from "@/lib/utils/toast";
import { toast as toastify } from "react-toastify";
import { LogIn } from "lucide-react";
import { playSound } from "@/lib/audio/audioUnlock";

// ---------------------------------------------------------------------------
// Toast body for an accepted join request — text + "Enter room" button
// ---------------------------------------------------------------------------

function JoinAcceptedToastBody({
  gameName,
  onEnter,
}: {
  gameName: string;
  onEnter: () => void;
}) {
  const t = useTranslations("lobby.joinRequestStatus");

  return (
    <div className="flex w-full min-w-0 flex-col gap-2.5">
      <span className="text-[0.85rem] leading-snug text-white/90">
        {t.rich("accepted", {
          room: gameName,
          b: (chunks) => (
            <span className="font-semibold text-emerald-300">{chunks}</span>
          ),
        })}
      </span>
      <button
        type="button"
        onClick={onEnter}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-1.5 text-emerald-300 transition-colors hover:bg-emerald-500/30 cursor-pointer"
      >
        <LogIn className="h-4 w-4 shrink-0" />
        <span className="text-[0.8rem] font-semibold">{t("enterRoom")}</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Subscribes to the caller's own join requests while they're in the lobby /
 * dashboard shell and fires a toast when a pending request is resolved by the
 * host:
 *  - accepted → success toast with an "Enter room" button (auto-closes 20s)
 *  - rejected → plain info toast
 *
 * Skips the initial snapshot so a fresh mount / reconnect doesn't replay
 * already-resolved statuses (live, in-session listener only).
 */
export function useMyJoinRequestNotifications() {
  const router = useRouter();
  const t = useTranslations("lobby.joinRequestStatus");
  const requests = useQuery(joinRequests.myActiveRequests, {});

  // Previous status per gameId. null until the first result is seen.
  const prevRef = useRef<Map<string, string> | null>(null);

  useEffect(() => {
    if (!requests) return;

    const current = new Map(
      requests.map((r) => [r.gameId as string, r.status]),
    );

    if (prevRef.current === null) {
      prevRef.current = current;
      return;
    }

    for (const req of requests) {
      const gameId = req.gameId as string;
      const prevStatus = prevRef.current.get(gameId);
      if (prevStatus !== "pending") continue;

      if (req.status === "accepted") {
        const toastId = toast.success(
          <JoinAcceptedToastBody
            gameName={req.gameName}
            onEnter={() => {
              toastify.dismiss(toastId);
              router.push(`/game/${gameId}`);
            }}
          />,
          { autoClose: 20000 },
        );
        playSound("/audio/new-request-notification.mp3");
      } else if (req.status === "rejected") {
        toast.info(t("rejected", { room: req.gameName }));
      }
    }

    prevRef.current = current;
  }, [requests, router, t]);
}
