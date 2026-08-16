"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions, sportsNightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { SPORTS } from "@/shared/lib/constants/game";
import {
  useGameRoom,
  type GameSessionState,
} from "@/features/game-room/context/gameRoomContext";
import { useHostPanelTimer } from "@/features/game-room/hooks/game/useHostPanelTimer";
import { useNightPanelFields } from "@/features/game-room/hooks/game/useNightPanelFields";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import type {
  HostPanelAction,
  HostPanelDescriptor,
} from "@/features/game-room/lib/hostPanel";

type SportsMafiaTargetPanelProps = {
  gameSessionState: GameSessionState;
};

/** The window is 5s; a 10s warning would never fire. */
const URGENT_SECONDS = 2;

/**
 * Sports `mafia_chooses_target` (docs/variants/sports/rules.md §5) — the one night
 * phase that is not "wait for a role, then advance".
 *
 * Every living mafia picks PRIVATELY inside a timed window, and the window has
 * three sequential host states:
 *
 *   1. not opened  → "Open kill window" (arms the 5s window)
 *   2. open        → disabled "Mafia choosing…", counting down
 *   3. closed      → "End mafia phase"
 *
 * The advance appears ONLY after the window has run, so the host cannot skip
 * the kill. The 5s close is server-driven (the `startMafiaTargetWindow`
 * scheduler flips the flag), so there is no client timer deciding anything —
 * the countdown here is display only.
 */
export default function SportsMafiaTargetPanel({
  gameSessionState,
}: SportsMafiaTargetPanelProps) {
  const t = useTranslations("game.host");
  const { gameId, ruleset, nightPhaseSession } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const startWindow = useMutation(sportsNightPhase.startMafiaTargetWindow);
  const updateSession = useMutation(gameSessions.update);

  const isWindowActive = nightPhaseSession?.mafiaTargetWindowActive === true;
  const hasWindowRun = nightPhaseSession?.mafiaTargetWindowStartedAt != null;

  const windowTimer = useHostPanelTimer(
    isWindowActive ? nightPhaseSession?.mafiaTargetWindowStartedAt : null,
    SPORTS.MAFIA_TARGET_WINDOW_MS,
    URGENT_SECONDS,
  );
  const fields = useNightPanelFields(gameSessionState, windowTimer ?? "none");

  const callMutation = async (run: () => Promise<unknown>) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await run();
    } catch (error) {
      console.error("Sports mafia target step failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // How many mafia have locked a pick — the summary pills already know, so the
  // count is read off them rather than querying the private selections twice.
  const picked = (fields.meta ?? []).filter((m) => m.value !== "—").length;
  const total = fields.meta?.length ?? 0;

  // The only night status worth a line: live progress through the window,
  // which nothing else on the panel says. "Window not opened" would just
  // restate the button, so that state carries no status at all.
  let action: HostPanelAction;
  let status: string | undefined;

  if (hasWindowRun && !isWindowActive) {
    action = {
      id: "sports-end-mafia",
      label: t("endMafiaPhase"),
      variant: "danger",
      onClick: () =>
        void callMutation(() =>
          updateSession({
            sessionId: gameSessionState._id,
            updates: ruleset.advanceUpdates("mafia_chooses_target"),
          }),
        ),
      isLoading,
    };
  } else if (isWindowActive) {
    action = {
      id: "sports-choosing",
      label: t("mafiaChoosing"),
      variant: "danger",
      onClick: () => undefined,
      disabled: true,
    };
    if (total > 0) status = t("mafiaPickedCount", { picked, total });
  } else {
    action = {
      id: "sports-open-window",
      label: t("openMafiaTargetWindow"),
      variant: "danger",
      onClick: () =>
        void callMutation(() => startWindow({ gameId: gameId as Id<"games"> })),
      isLoading,
    };
  }

  const descriptor: HostPanelDescriptor = {
    ...fields,
    status,
    actions: [action],
  };

  return <HostPanel descriptor={descriptor} />;
}
