"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { gameBroadcasts } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { toast } from "@/lib/utils/toast";

type BroadcastKind = "staff" | "system" | "news";

/** How long a room notification stays on screen (longer than a normal toast so
 *  players have time to read a staff message). */
const BROADCAST_AUTOCLOSE_MS = 8000;

/**
 * Subscribes to the game's room-notification channel and surfaces each new
 * broadcast as a one-shot toast — for everyone in the room, players and
 * spectators alike. Source-agnostic: presentation is driven by `kind`.
 *
 * Only genuinely new arrivals toast: the rows present on first load are marked
 * as already-seen (so joining mid-game never replays the backlog), matching the
 * skip-first-render approach in `useFoulNotification`.
 */
export function useGameBroadcasts(gameId: Id<"games">): void {
  const t = useTranslations("game.broadcast");
  const broadcasts = useQuery(gameBroadcasts.recent, { gameId });
  // `null` until the first successful load; then a set of already-toasted ids.
  const shownRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!broadcasts) return;

    // First load: adopt the current window as seen without toasting the backlog.
    if (shownRef.current === null) {
      shownRef.current = new Set(broadcasts.map((b) => b._id));
      return;
    }

    // `recent` is newest-first; toast oldest-first so bursts appear in order.
    for (const b of [...broadcasts].reverse()) {
      if (shownRef.current.has(b._id)) continue;
      shownRef.current.add(b._id);
      toast.info(renderBroadcast(b, t), { autoClose: BROADCAST_AUTOCLOSE_MS });
    }
  }, [broadcasts, t]);
}

type BroadcastRow = {
  _id: string;
  kind: BroadcastKind;
  text: string;
  title?: string;
  senderNickname?: string;
};

/**
 * A broadcast toast: an optional label line (headline, or the staff sender) over
 * the message body. Add a case here when introducing a new `kind`.
 */
function renderBroadcast(
  b: BroadcastRow,
  t: ReturnType<typeof useTranslations>,
): React.ReactNode {
  let label: string | undefined = b.title;
  if (!label && b.kind === "staff") {
    label = b.senderNickname
      ? `${t("staffLabel")} · ${b.senderNickname}`
      : t("staffLabel");
  }

  return (
    <div className="flex flex-col gap-0.5">
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wider text-sky-300">
          {label}
        </span>
      )}
      <span>{b.text}</span>
    </div>
  );
}
