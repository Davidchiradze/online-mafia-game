"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { startNight } from "@/lib/nightPhase/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import PhaseButton from "@/components/ui/PhaseButton";

type ContinueNextRoundButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to continue to the next round (back to night phase).
 * This increments the night number and creates a new night_phase_sessions row.
 */
const ContinueNextRoundButton = ({
  gameSessionState,
}: ContinueNextRoundButtonProps) => {
  const { gameId } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);

  const handleContinueNextRound = async () => {
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
        nominated_players: [], // Reset nominations
      });
      if (!res?.ok) {
        console.error("Failed to continue to next round:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton
      onClick={handleContinueNextRound}
      isLoading={isLoading}
      label="Start"
    />
  );
};

export default ContinueNextRoundButton;
