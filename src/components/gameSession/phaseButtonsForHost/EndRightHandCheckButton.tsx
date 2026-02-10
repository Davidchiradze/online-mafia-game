"use client";

import React, { useState } from "react";
import { updateGameSession } from "@/lib/gameSession/actions";
import { GameSessionState } from "@/types/game/type";
import { GAME_PHASES } from "@/lib/constants/game";
import PhaseButton from "@/components/ui/PhaseButton";

type EndRightHandCheckButtonProps = {
  gameSessionState: GameSessionState;
};

/**
 * Button to end right hand's yakuza check
 */
const EndRightHandCheckButton = ({
  gameSessionState,
}: EndRightHandCheckButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEndRightHandCheck = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await updateGameSession(gameSessionState.id, {
        game_phase: GAME_PHASES[12], // "yakuza_and_shogun_chooses_target"
      });
      if (!res?.ok) {
        console.error("Failed to end right hand's check:", res?.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PhaseButton onClick={handleEndRightHandCheck} isLoading={isLoading} />
  );
};

export default EndRightHandCheckButton;
