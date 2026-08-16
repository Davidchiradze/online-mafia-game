"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { useTranslations } from "next-intl";
import { SPORTS } from "@/shared/lib/constants/game";
import {
  useGameRoom,
  type GameSessionState,
} from "@/features/game-room/context/gameRoomContext";
import { useHostPanelTimer } from "@/features/game-room/hooks/game/useHostPanelTimer";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import type { HostPanelDescriptor } from "@/features/game-room/lib/hostPanel";

type BestMovePanelProps = {
  gameSessionState: GameSessionState;
};

/**
 * Best move (docs/variants/sports/rules.md §6): the first night's victim names three
 * suspects before saying goodbye.
 *
 * The host does not pick anything — the victim taps seats and this panel
 * watches. The one button is ALWAYS enabled and its label morphs with progress:
 * "Skip Best Move" until the third suspect lands, "Start Farewell Speech" after.
 * That is the deadlock guard from §6.3 — an AFK or disconnected victim can never
 * stall the table, and skipping keeps whatever partial set exists.
 *
 * The 30s countdown is display only. Nothing auto-advances at zero.
 */
export default function BestMovePanel({
  gameSessionState,
}: BestMovePanelProps) {
  const t = useTranslations("game.host");
  const tPhases = useTranslations("game.phases");
  const { ruleset, nightPhaseSession } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);

  const suspects = nightPhaseSession?.bestMoveSuspects ?? [];
  const victimSeat = nightPhaseSession?.bestMoveSeat ?? null;
  const total = SPORTS.BEST_MOVE_SUSPECT_COUNT;
  const isComplete = suspects.length >= total;

  const timer = useHostPanelTimer(
    gameSessionState.phaseStartedAt,
    SPORTS.BEST_MOVE_WINDOW_MS,
  );

  const handleAdvance = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: ruleset.advanceUpdates("best_move"),
      });
    } catch (error) {
      console.error('Failed to advance from "best_move":', error);
    } finally {
      setIsLoading(false);
    }
  };

  const descriptor: HostPanelDescriptor = {
    // Best move only ever runs at the dawn of night 1.
    eyebrow: t("dawnCounter", {
      night: Math.max(1, gameSessionState.currentNightNumber),
    }),
    title: tPhases("best_move"),
    timer,
    speakers:
      victimSeat !== null
        ? [{ role: "now", label: t("bestMoveVictim"), seat: victimSeat }]
        : undefined,
    // Rose, like a nomination: these are accusations the victim is making, not
    // a run the host is stepping through.
    chipsLabel: suspects.length > 0 ? t("suspectsLabel") : undefined,
    chips:
      suspects.length > 0
        ? suspects.map((seat) => ({ seat, tone: "nominated" as const }))
        : undefined,
    // Deliberately no progress bar: the count is what the host decides "skip"
    // on, so it is said in WORDS below, which survives the collapse to a bar.
    // A bar carrying both would also earn a disclosure chevron whose sheet
    // shows nothing the bar was not already showing.
    status: isComplete
      ? t("bestMoveComplete")
      : t("bestMoveProgress", { count: suspects.length, total }),
    actions: [
      {
        id: "best-move-advance",
        label: isComplete ? t("startFarewellSpeech") : t("skipBestMove"),
        variant: isComplete ? "success" : "primary",
        onClick: () => void handleAdvance(),
        isLoading,
      },
    ],
  };

  return <HostPanel descriptor={descriptor} />;
}
