"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { sportsNightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import PhaseButton from "@/shared/ui/PhaseButton";
import PhaseAdvanceButton from "./PhaseAdvanceButton";

type SportsMafiaTargetControlsProps = {
  gameSessionState: NonNullable<
    ReturnType<typeof useGameRoom>["gameSessionState"]
  >;
};

/**
 * Host controls for `mafia_chooses_target` (docs/sports-mafia.md §5). Three
 * sequential states, driven by the current night session's window fields:
 *
 *  1. window not yet opened  → "Open Kill Window" (arms the 5s selection window)
 *  2. window active          → disabled "Mafia choosing…" (auto-closes at +5s)
 *  3. window opened + closed  → "Finish Mafia Phase" (advance to the Don's check)
 *
 * The next-phase button appears ONLY after the window has run and closed, so the
 * host cannot skip the kill selection. The 5s auto-close is server-driven (the
 * `startMafiaTargetWindow` scheduler flips `mafiaTargetWindowActive`), so this
 * component just reacts to the reactive window state — no client timer.
 */
export default function SportsMafiaTargetControls({
  gameSessionState,
}: SportsMafiaTargetControlsProps) {
  const t = useTranslations("game.host");
  const { gameId, nightPhaseSession } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const startWindow = useMutation(sportsNightPhase.startMafiaTargetWindow);

  const windowActive = nightPhaseSession?.mafiaTargetWindowActive === true;
  const windowOpened = nightPhaseSession?.mafiaTargetWindowStartedAt != null;

  // State 3 — window has run and closed → allow advancing.
  if (windowOpened && !windowActive) {
    return (
      <PhaseAdvanceButton
        gameSessionState={gameSessionState}
        sourcePhase="mafia_chooses_target"
        labelKey="endMafiaPhase"
      />
    );
  }

  // State 2 — window open → wait for the 5s auto-close (no advance yet).
  if (windowActive) {
    return (
      <PhaseButton
        onClick={() => {}}
        isLoading={false}
        disabled
        label={t("mafiaChoosing")}
        variant="danger"
      />
    );
  }

  // State 1 — not opened yet → arm the 5s window.
  const handleOpen = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await startWindow({ gameId: gameId as Id<"games"> });
    } catch (error) {
      console.error("Failed to open mafia target window:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleOpen}
      isLoading={isLoading}
      label={t("openMafiaTargetWindow")}
      variant="danger"
    />
  );
}
