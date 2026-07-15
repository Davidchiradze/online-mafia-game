"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions, sportsNightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import PhaseButton from "@/components/ui/PhaseButton";

type StartSportsMafiaPhaseButtonProps = {
  gameSessionState: NonNullable<
    ReturnType<typeof useGameRoom>["gameSessionState"]
  >;
};

/**
 * Sports night start (docs/sports-mafia.md §5): advances `night_phase →
 * mafia_chooses_target` (via the resolved ruleset graph) and immediately arms
 * the 5s kill-selection window. Distinct from Japanese's `StartMafiaTargetButton`
 * (single-authority, no window) — here every living mafia picks privately during
 * the window, and the host still advances manually with "Finish Mafia Phase".
 */
const StartSportsMafiaPhaseButton = ({
  gameSessionState,
}: StartSportsMafiaPhaseButtonProps) => {
  const t = useTranslations("game.host");
  const { gameId, ruleset } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);
  const startWindow = useMutation(sportsNightPhase.startMafiaTargetWindow);

  const handleStart = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: ruleset.advanceUpdates("night_phase"),
      });
      await startWindow({ gameId: gameId as Id<"games"> });
    } catch (error) {
      console.error("Failed to start sports mafia phase:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleStart}
      isLoading={isLoading}
      label={t("startMafiaPhase")}
      variant="danger"
    />
  );
};

export default StartSportsMafiaPhaseButton;
