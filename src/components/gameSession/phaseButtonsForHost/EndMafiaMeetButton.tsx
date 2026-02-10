"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type EndMafiaMeetButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to end the mafia meeting phase
 */
const EndMafiaMeetButton = ({ gameSessionState }: EndMafiaMeetButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEndMafiaMeet = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[3], // "don_chooses_right_hand"
      });
      if (!res?.ok) {
        console.error("Failed to end mafia meeting:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return <PhaseButton onClick={handleEndMafiaMeet} isLoading={isLoading} />;
};

export default EndMafiaMeetButton;
