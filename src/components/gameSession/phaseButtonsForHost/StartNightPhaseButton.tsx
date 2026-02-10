"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { startNight } from "@/lib/nightPhase/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import PhaseButton from "@/components/ui/PhaseButton";

type StartNightPhaseButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to start the night phase after introduction.
 * This increments the night number and creates a new night_phase_sessions row.
 */
const StartNightPhaseButton = ({
  gameSessionState,
}: StartNightPhaseButtonProps) => {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartNightPhase = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const nightRes = await startNight(gameId);
      if (!nightRes.ok) {
        console.error("Failed to start night:", nightRes.message);
        return;
      }

      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[8], // "night_phase"
      });
      if (!res?.ok) {
        console.error("Failed to start night phase:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleStartNightPhase}
      isLoading={isLoading}
      label="Start"
    />
  );
};

export default StartNightPhaseButton;
