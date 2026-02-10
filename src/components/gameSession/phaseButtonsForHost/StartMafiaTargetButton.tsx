"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { startNight } from "@/lib/nightPhase/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import PhaseButton from "@/components/ui/PhaseButton";

type StartMafiaTargetButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to start mafia target selection.
 * If coming from night_phase (night already started), just transitions.
 * If current_night_number is 0, starts a new night first.
 */
const StartMafiaTargetButton = ({
  gameSessionState,
}: StartMafiaTargetButtonProps) => {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartMafiaTarget = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (
        !gameSessionState.current_night_number ||
        gameSessionState.current_night_number === 0
      ) {
        const nightRes = await startNight(gameId);
        if (!nightRes.ok) {
          console.error("Failed to start night:", nightRes.message);
          return;
        }
      }

      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[9], // "mafia_chooses_target"
      });
      if (!res?.ok) {
        console.error("Failed to start mafia target selection:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleStartMafiaTarget}
      isLoading={isLoading}
      label="Start"
    />
  );
};

export default StartMafiaTargetButton;
