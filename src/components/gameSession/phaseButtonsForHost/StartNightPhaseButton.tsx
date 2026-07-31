"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { nightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import PhaseButton from "@/shared/ui/PhaseButton";

type StartNightPhaseButtonProps = {
  gameSessionState: NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
};

/**
 * Button to start the night phase after introduction.
 * Delegates to the single `enterNight` transition, which increments the night
 * number, resets state, and creates the night_phase_sessions row.
 */
const StartNightPhaseButton = ({
  gameSessionState: _gameSessionState,
}: StartNightPhaseButtonProps) => {
  const t = useTranslations("game.host");
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const enterNight = useMutation(nightPhase.enterNight);

  const handleStartNightPhase = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await enterNight({ gameId: gameId as Id<"games"> });
    } catch (error) {
      console.error("Failed to start night phase:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleStartNightPhase}
      isLoading={isLoading}
      label={t("startNight")}
      variant="secondary"
    />
  );
};

export default StartNightPhaseButton;
